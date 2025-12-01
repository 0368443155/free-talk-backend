import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { AddLessonCommand } from '../commands/add-lesson.command';
import { CourseSession } from '../../entities/course-session.entity';
import { Lesson, LessonStatus } from '../../entities/lesson.entity';
import { Meeting, MeetingStatus, MeetingType } from '../../../meeting/entities/meeting.entity';
import { User } from '../../../../users/user.entity';
import { ConfigService } from '@nestjs/config';

@Injectable()
@CommandHandler(AddLessonCommand)
export class AddLessonHandler implements ICommandHandler<AddLessonCommand> {
  private readonly logger = new Logger(AddLessonHandler.name);

  constructor(
    @InjectRepository(CourseSession)
    private readonly sessionRepository: Repository<CourseSession>,
    @InjectRepository(Lesson)
    private readonly lessonRepository: Repository<Lesson>,
    @InjectRepository(Meeting)
    private readonly meetingRepository: Repository<Meeting>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly configService: ConfigService,
  ) {}

  async execute(command: AddLessonCommand) {
    this.logger.log(
      `Adding lesson to session ${command.sessionId} by teacher ${command.teacherId}`,
    );

    const session = await this.sessionRepository.findOne({
      where: { id: command.sessionId },
      relations: ['course'],
    });

    if (!session) {
      throw new NotFoundException(`Session with ID ${command.sessionId} not found`);
    }

    if (session.course.teacher_id !== command.teacherId) {
      throw new ForbiddenException('You can only add lessons to your own course sessions');
    }

    // Validate time format and logic
    if (command.dto.end_time <= command.dto.start_time) {
      throw new BadRequestException('End time must be after start time');
    }

    // Calculate duration
    const duration = this.calculateDurationMinutes(
      command.dto.start_time,
      command.dto.end_time,
    );

    // Generate LiveKit room name
    const livekitRoomName = `course_${session.course_id}_session_${session.session_number}_lesson_${command.dto.lesson_number}`;

    // Generate meeting title
    const meetingTitle = `${session.course.title} - ${session.title} - ${command.dto.title}`;

    // Get teacher
    const teacher = await this.userRepository.findOne({
      where: { id: command.teacherId },
    });

    if (!teacher) {
      throw new NotFoundException('Teacher not found');
    }

    return await this.dataSource.transaction(async (manager) => {
      // Create Meeting first
      const scheduledDateTime = new Date(`${command.dto.scheduled_date} ${command.dto.start_time}`);
      const meeting = manager.create(Meeting, {
        title: meetingTitle,
        description: command.dto.description,
        host: teacher,
        lesson_id: undefined,
        course_id: session.course_id,
        session_id: command.sessionId,
        teacher_name: teacher.username,
        subject_name: session.course.title,
        scheduled_at: scheduledDateTime,
        max_participants: session.course.max_students,
        meeting_type: MeetingType.TEACHER_CLASS,
        status: MeetingStatus.SCHEDULED,
        affiliate_code: session.course.affiliate_code,
        settings: {
          allow_screen_share: true,
          allow_chat: true,
          allow_reactions: true,
          record_meeting: true,
        },
      });

      const savedMeeting = await manager.save(Meeting, meeting);

      // Generate QR code link
      const frontendUrl = this.configService.get('FRONTEND_URL') || 'http://localhost:3001';
      const lessonLink = `${frontendUrl}/courses/${session.course_id}/sessions/${session.session_number}/lessons/${command.dto.lesson_number}`;
      const qrData = {
        course_id: session.course_id,
        session_id: command.sessionId,
        lesson_id: null,
        lesson_number: command.dto.lesson_number,
        title: command.dto.title,
        date: command.dto.scheduled_date,
        time: command.dto.start_time,
        room: livekitRoomName,
        meeting_id: savedMeeting.id,
        qr_code_link: lessonLink,
      };

      // Create Lesson
      const lesson = manager.create(Lesson, {
        session_id: command.sessionId,
        lesson_number: command.dto.lesson_number,
        title: command.dto.title,
        description: command.dto.description,
        scheduled_date: new Date(command.dto.scheduled_date),
        start_time: command.dto.start_time,
        end_time: command.dto.end_time,
        duration_minutes: duration,
        meeting_id: savedMeeting.id,
        livekit_room_name: livekitRoomName,
        meeting_link: `${frontendUrl}/meetings/${savedMeeting.id}`,
        qr_code_url: undefined,
        qr_code_data: JSON.stringify(qrData),
        status: LessonStatus.SCHEDULED,
        is_preview: command.dto.is_preview || false,
        is_free: command.dto.is_free || false,
      });

      const savedLesson = await manager.save(Lesson, lesson);

      // Update meeting with lesson_id
      await manager.update(Meeting, savedMeeting.id, {
        lesson_id: savedLesson.id,
      });

      // Update session total_lessons
      await manager.update(CourseSession, command.sessionId, {
        total_lessons: () => 'total_lessons + 1',
      });

      this.logger.log(
        `Lesson ${savedLesson.id} added to session ${command.sessionId}`,
      );

      return savedLesson;
    });
  }

  private calculateDurationMinutes(startTime: string, endTime: string): number {
    const [startHours, startMinutes] = startTime.split(':').map(Number);
    const [endHours, endMinutes] = endTime.split(':').map(Number);

    const startTotalMinutes = startHours * 60 + startMinutes;
    const endTotalMinutes = endHours * 60 + endMinutes;

    return endTotalMinutes - startTotalMinutes;
  }
}

