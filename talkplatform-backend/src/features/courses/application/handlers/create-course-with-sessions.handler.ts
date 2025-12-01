import {
  Injectable,
  Logger,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { CreateCourseWithSessionsCommand } from '../commands/create-course-with-sessions.command';
import { Course, CourseStatus, PriceType, CourseCategory } from '../../entities/course.entity';
import { CourseSession, SessionStatus } from '../../entities/course-session.entity';
import { Lesson, LessonStatus } from '../../entities/lesson.entity';
import { LessonMaterial } from '../../entities/lesson-material.entity';
import { Meeting, MeetingStatus, MeetingType } from '../../../meeting/entities/meeting.entity';
import { User, UserRole } from '../../../../users/user.entity';
import { QrCodeService } from '../../../../common/services/qr-code.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
@CommandHandler(CreateCourseWithSessionsCommand)
export class CreateCourseWithSessionsHandler
  implements ICommandHandler<CreateCourseWithSessionsCommand>
{
  private readonly logger = new Logger(CreateCourseWithSessionsHandler.name);

  constructor(
    @InjectRepository(Course)
    private readonly courseRepository: Repository<Course>,
    @InjectRepository(CourseSession)
    private readonly sessionRepository: Repository<CourseSession>,
    @InjectRepository(Lesson)
    private readonly lessonRepository: Repository<Lesson>,
    @InjectRepository(LessonMaterial)
    private readonly lessonMaterialRepository: Repository<LessonMaterial>,
    @InjectRepository(Meeting)
    private readonly meetingRepository: Repository<Meeting>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly qrCodeService: QrCodeService,
    private readonly configService: ConfigService,
  ) {}

  async execute(command: CreateCourseWithSessionsCommand): Promise<Course> {
    this.logger.log(`Creating course with sessions for teacher: ${command.teacherId}`);

    // Validate teacher
    const teacher = await this.userRepository.findOne({
      where: { id: command.teacherId },
    });

    if (!teacher) {
      throw new ForbiddenException('User not found');
    }

    if (teacher.role !== UserRole.TEACHER && teacher.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Only teachers and admins can create courses');
    }

    // Use transaction to ensure all-or-nothing
    return await this.dataSource.transaction(async (manager) => {
      // Determine price_type based on provided prices
      let priceType: PriceType;
      if (command.dto.price_per_session && command.dto.price_per_session > 0) {
        priceType = PriceType.PER_SESSION;
      } else if (command.dto.price_full_course && command.dto.price_full_course > 0) {
        priceType = PriceType.FULL_COURSE;
      } else {
        priceType = PriceType.PER_SESSION;
      }

      // 1. Create course
      const affiliateCode = this.generateAffiliateCode();
      const course = manager.create(Course, {
        teacher_id: command.teacherId,
        title: command.dto.title,
        description: command.dto.description,
        category: command.dto.category as CourseCategory | undefined,
        tags: command.dto.tags,
        level: command.dto.level,
        language: command.dto.language,
        price_type: priceType,
        price_full_course: command.dto.price_full_course,
        price_per_session: command.dto.price_per_session,
        max_students: command.dto.max_students || 30,
        duration_hours: command.dto.duration_hours,
        total_sessions: command.dto.sessions.length,
        status: CourseStatus.DRAFT,
        is_published: false,
        affiliate_code: affiliateCode,
      });

      const savedCourse = await manager.save(Course, course);

      // Generate share link and QR code for course
      const frontendUrl = this.configService.get('FRONTEND_URL') || 'http://localhost:3001';
      const shareLink = `${frontendUrl}/courses/${savedCourse.id}`;

      try {
        const qrCodeDataUrl = await this.qrCodeService.generateDataUrl(shareLink);
        await manager.update(Course, savedCourse.id, {
          share_link: shareLink,
          qr_code_url: qrCodeDataUrl,
        });
      } catch (error) {
        this.logger.error(
          `Failed to generate QR code for course ${savedCourse.id}: ${error.message}`,
        );
      }

      // 2. Create sessions with lessons
      for (const sessionDto of command.dto.sessions) {
        const session = manager.create(CourseSession, {
          course_id: savedCourse.id,
          session_number: sessionDto.session_number,
          title: sessionDto.title,
          description: sessionDto.description,
          total_lessons: sessionDto.lessons.length,
          status: SessionStatus.DRAFT,
        });

        const savedSession = await manager.save(CourseSession, session);

        // 3. Create lessons for this session
        for (const lessonDto of sessionDto.lessons) {
          try {
            this.logger.log(
              `Creating lesson ${lessonDto.lesson_number} for session ${sessionDto.session_number}`,
            );

            // Validate time format and logic
            if (lessonDto.end_time <= lessonDto.start_time) {
              throw new BadRequestException(
                `End time (${lessonDto.end_time}) must be after start time (${lessonDto.start_time}) for lesson ${lessonDto.lesson_number}`,
              );
            }

            // Calculate duration
            const duration = this.calculateDurationMinutes(
              lessonDto.start_time,
              lessonDto.end_time,
            );

            if (duration <= 0) {
              throw new BadRequestException(
                `Invalid duration calculated for lesson ${lessonDto.lesson_number}`,
              );
            }

            // Generate LiveKit room name
            const livekitRoomName = `course_${savedCourse.id}_session_${sessionDto.session_number}_lesson_${lessonDto.lesson_number}`;

            // Generate meeting title
            const meetingTitle = `${savedCourse.title} - ${sessionDto.title} - ${lessonDto.title}`;

            // 4. Create Meeting first
            const scheduledDateTime = new Date(`${lessonDto.scheduled_date} ${lessonDto.start_time}`);
            const meeting = manager.create(Meeting, {
              title: meetingTitle,
              description: lessonDto.description,
              host: teacher,
              lesson_id: undefined,
              course_id: savedCourse.id,
              session_id: savedSession.id,
              teacher_name: teacher.username,
              subject_name: savedCourse.title,
              scheduled_at: scheduledDateTime,
              max_participants: savedCourse.max_students,
              meeting_type: MeetingType.TEACHER_CLASS,
              status: MeetingStatus.SCHEDULED,
              affiliate_code: savedCourse.affiliate_code,
              settings: {
                allow_screen_share: true,
                allow_chat: true,
                allow_reactions: true,
                record_meeting: true,
              },
            });

            const savedMeeting = await manager.save(Meeting, meeting);

            // 5. Create Lesson
            const lessonLink = `${frontendUrl}/courses/${savedCourse.id}/sessions/${sessionDto.session_number}/lessons/${lessonDto.lesson_number}`;
            const qrData = {
              course_id: savedCourse.id,
              session_id: savedSession.id,
              lesson_id: null,
              lesson_number: lessonDto.lesson_number,
              title: lessonDto.title,
              date: lessonDto.scheduled_date,
              time: lessonDto.start_time,
              room: livekitRoomName,
              meeting_id: savedMeeting.id,
              qr_code_link: lessonLink,
            };

            const lesson = manager.create(Lesson, {
              session_id: savedSession.id,
              lesson_number: lessonDto.lesson_number,
              title: lessonDto.title,
              description: lessonDto.description,
              scheduled_date: new Date(lessonDto.scheduled_date),
              start_time: lessonDto.start_time,
              end_time: lessonDto.end_time,
              duration_minutes: duration,
              meeting_id: savedMeeting.id,
              livekit_room_name: livekitRoomName,
              meeting_link: `${frontendUrl}/meetings/${savedMeeting.id}`,
              qr_code_url: undefined,
              qr_code_data: JSON.stringify(qrData),
              status: LessonStatus.SCHEDULED,
            });

            const savedLesson = await manager.save(Lesson, lesson);

            // 6. Update Meeting with lesson_id
            await manager.update(Meeting, savedMeeting.id, {
              lesson_id: savedLesson.id,
            });

            // 7. Create materials for this lesson
            if (lessonDto.materials && lessonDto.materials.length > 0) {
              for (const materialDto of lessonDto.materials) {
                const material = manager.create(LessonMaterial, {
                  lesson_id: savedLesson.id,
                  type: materialDto.type,
                  title: materialDto.title,
                  description: materialDto.description,
                  file_url: materialDto.file_url,
                  file_name: materialDto.file_name,
                  file_size: materialDto.file_size,
                  file_type: materialDto.file_type,
                  display_order: materialDto.display_order || 0,
                  is_required: materialDto.is_required || false,
                });

                await manager.save(LessonMaterial, material);
              }
            }

            this.logger.log(`Lesson ${lessonDto.lesson_number} created successfully`);
          } catch (lessonError) {
            this.logger.error(
              `Error creating lesson ${lessonDto.lesson_number}: ${lessonError.message}`,
              lessonError.stack,
            );
            throw lessonError;
          }
        }
      }

      // Reload course with relations
      const finalCourse = await manager.findOne(Course, {
        where: { id: savedCourse.id },
        relations: ['sessions', 'teacher'],
      });

      if (!finalCourse) {
        throw new BadRequestException('Failed to retrieve created course');
      }

      this.logger.log(`Course with sessions created: ${finalCourse.id}`);
      return finalCourse;
    });
  }

  private generateAffiliateCode(): string {
    return `AFF${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
  }

  private calculateDurationMinutes(startTime: string, endTime: string): number {
    const [startHours, startMinutes] = startTime.split(':').map(Number);
    const [endHours, endMinutes] = endTime.split(':').map(Number);

    const startTotalMinutes = startHours * 60 + startMinutes;
    const endTotalMinutes = endHours * 60 + endMinutes;

    return endTotalMinutes - startTotalMinutes;
  }
}

