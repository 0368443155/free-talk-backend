import {
    Injectable,
    NotFoundException,
    BadRequestException,
    ForbiddenException,
    Logger
} from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere, DataSource } from 'typeorm';
import { Course, CourseStatus, PriceType, CourseCategory } from './entities/course.entity';
import { CourseSession, SessionStatus } from './entities/course-session.entity';
import { SessionMaterial, MaterialType } from './entities/session-material.entity';
import { Lesson, LessonStatus } from './entities/lesson.entity';
import { LessonMaterial } from './entities/lesson-material.entity';
import { Meeting, MeetingStatus, MeetingType } from '../meeting/entities/meeting.entity';
import { User, UserRole } from '../../users/user.entity';
import { CreateCourseDto, UpdateCourseDto, GetCoursesQueryDto, CreateCourseWithSessionsDto } from './dto/course.dto';
import { CreateSessionDto, UpdateSessionDto } from './dto/session.dto';
import { CreateSessionMaterialDto } from './dto/session-material.dto';
import { CreateLessonDto, UpdateLessonDto } from './dto/lesson.dto';
import { QrCodeService } from '../../common/services/qr-code.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class CoursesService {
    private readonly logger = new Logger(CoursesService.name);

    constructor(
        @InjectRepository(Course)
        private readonly courseRepository: Repository<Course>,
        @InjectRepository(CourseSession)
        private readonly sessionRepository: Repository<CourseSession>,
        @InjectRepository(SessionMaterial)
        private readonly materialRepository: Repository<SessionMaterial>,
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
    ) { }

    async createCourse(teacherId: string, dto: CreateCourseDto): Promise<Course> {
        this.logger.log(`Creating course for teacher: ${teacherId}`);
        
        const teacher = await this.userRepository.findOne({
            where: { id: teacherId }
        });

        if (!teacher) {
            this.logger.warn(`User not found: ${teacherId}`);
            throw new ForbiddenException('User not found');
        }

        this.logger.log(`User found: ${teacher.id}, role: ${teacher.role}`);

        if (teacher.role !== UserRole.TEACHER && teacher.role !== UserRole.ADMIN) {
            this.logger.warn(`User ${teacherId} with role ${teacher.role} attempted to create course`);
            throw new ForbiddenException('Only teachers and admins can create courses');
        }

        if (dto.price_type === PriceType.PER_SESSION && (!dto.price_per_session || dto.price_per_session < 1)) {
            throw new BadRequestException('Price per session must be at least $1.00');
        }

        if (dto.price_type === PriceType.FULL_COURSE && (!dto.price_full_course || dto.price_full_course < 1)) {
            throw new BadRequestException('Full course price must be at least $1.00');
        }

        const affiliateCode = this.generateAffiliateCode();

        // Ensure total_sessions is always 0 when creating (will be updated when sessions are added)
        const { total_sessions, ...dtoWithoutTotalSessions } = dto;

        const course = this.courseRepository.create({
            teacher_id: teacherId,
            ...dtoWithoutTotalSessions,
            affiliate_code: affiliateCode,
            status: CourseStatus.DRAFT,
            is_published: false,
            total_sessions: 0, // Always start with 0, will be updated when sessions are added
        });

        const savedCourse = await this.courseRepository.save(course);

        const frontendUrl = this.configService.get('FRONTEND_URL') || 'http://localhost:3001';
        const shareLink = `${frontendUrl}/courses/${savedCourse.id}`;

        try {
            const qrCodeDataUrl = await this.qrCodeService.generateDataUrl(shareLink);

            await this.courseRepository.update(savedCourse.id, {
                share_link: shareLink,
                qr_code_url: qrCodeDataUrl,
            });

            savedCourse.share_link = shareLink;
            savedCourse.qr_code_url = qrCodeDataUrl;
        } catch (error) {
            this.logger.error(`Failed to generate QR code for course ${savedCourse.id}: ${error.message}`);
        }

        this.logger.log(`✅ Course created: ${savedCourse.title} by teacher ${teacher.username}`);

        return savedCourse;
    }

    async getCourses(query: GetCoursesQueryDto): Promise<{
        data: Course[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    }> {
        const {
            teacher_id,
            status,
            language,
            level,
            category,
            search,
            minPrice,
            maxPrice,
            sortBy = 'created_at',
            sortOrder = 'DESC',
            page = 1,
            limit = 20
        } = query;

        const queryBuilder = this.courseRepository
            .createQueryBuilder('course')
            .leftJoinAndSelect('course.teacher', 'teacher')
            .leftJoinAndSelect('course.sessions', 'sessions')
            .where('course.is_published = :published', { published: true });

        if (teacher_id) {
            queryBuilder.andWhere('course.teacher_id = :teacher_id', { teacher_id });
        }
        if (status) {
            queryBuilder.andWhere('course.status = :status', { status });
        }
        if (language) {
            queryBuilder.andWhere('course.language = :language', { language });
        }
        if (level) {
            queryBuilder.andWhere('course.level = :level', { level });
        }
        if (category) {
            queryBuilder.andWhere('course.category = :category', { category });
        }
        if (search) {
            queryBuilder.andWhere(
                '(course.title LIKE :search OR course.description LIKE :search)',
                { search: `%${search}%` }
            );
        }
        if (minPrice !== undefined) {
            queryBuilder.andWhere(
                '(course.price_full_course >= :minPrice OR course.price_per_session >= :minPrice)',
                { minPrice }
            );
        }
        if (maxPrice !== undefined) {
            queryBuilder.andWhere(
                '(course.price_full_course <= :maxPrice OR course.price_per_session <= :maxPrice)',
                { maxPrice }
            );
        }

        // Apply sorting
        const validSortFields = ['created_at', 'price_full_course', 'title', 'current_students'];
        const sortField = validSortFields.includes(sortBy) ? sortBy : 'created_at';
        const sortDirection = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
        queryBuilder.orderBy(`course.${sortField}`, sortDirection);

        // Apply pagination
        const skip = (page - 1) * limit;
        queryBuilder.skip(skip).take(limit);

        const [data, total] = await queryBuilder.getManyAndCount();

        return {
            data,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };
    }

    async getCourseById(courseId: string, userId?: string): Promise<Course> {
        this.logger.log(`Getting course by ID: ${courseId}, userId: ${userId || 'anonymous'}`);
        
        const course = await this.courseRepository.findOne({
            where: { id: courseId },
            relations: [
                'teacher',
                'sessions',
                'sessions.lessons',
                'sessions.lessons.materials',
                'sessions.lessons.meeting',
            ],
        });

        if (!course) {
            this.logger.warn(`Course not found: ${courseId}`);
            throw new NotFoundException('Course not found');
        }

        this.logger.log(`Course found: ${course.id}, is_published: ${course.is_published}, teacher_id: ${course.teacher_id}`);

        // If user is not the owner, only show published courses
        if (!userId || course.teacher_id !== userId) {
            if (!course.is_published) {
                this.logger.warn(`Course ${courseId} is not published and user ${userId || 'anonymous'} is not the owner`);
                throw new NotFoundException('Course not found');
            }
        }

        // Sort sessions by session_number
        if (course.sessions) {
            course.sessions.sort((a, b) => a.session_number - b.session_number);
        }

        this.logger.log(`✅ Course retrieved successfully: ${courseId}`);
        return course;
    }

    async updateCourse(
        courseId: string,
        teacherId: string,
        dto: UpdateCourseDto
    ): Promise<Course> {
        const course = await this.getCourseById(courseId, teacherId);

        if (course.teacher_id !== teacherId) {
            throw new ForbiddenException('You can only update your own courses');
        }

        if (dto.price_type) {
            if (dto.price_type === PriceType.PER_SESSION && dto.price_per_session && dto.price_per_session < 1) {
                throw new BadRequestException('Price per session must be at least $1.00');
            }
            if (dto.price_type === PriceType.FULL_COURSE && dto.price_full_course && dto.price_full_course < 1) {
                throw new BadRequestException('Full course price must be at least $1.00');
            }
        }

        await this.courseRepository.update(courseId, dto);

        this.logger.log(`✏️ Course updated: ${courseId}`);

        return this.getCourseById(courseId, teacherId);
    }

    async deleteCourse(courseId: string, teacherId: string): Promise<void> {
        const course = await this.getCourseById(courseId, teacherId);

        if (course.teacher_id !== teacherId) {
            throw new ForbiddenException('You can only delete your own courses');
        }

        if (course.current_students > 0) {
            throw new BadRequestException('Cannot delete course with enrolled students');
        }

        await this.courseRepository.delete(courseId);

        this.logger.log(`🗑️ Course deleted: ${courseId}`);
    }

    async addSession(
        courseId: string,
        teacherId: string,
        dto: CreateSessionDto
    ): Promise<CourseSession> {
        const course = await this.getCourseById(courseId, teacherId);

        if (course.teacher_id !== teacherId) {
            throw new ForbiddenException('You can only add sessions to your own courses');
        }

        const existingSession = await this.sessionRepository.findOne({
            where: {
                course_id: courseId,
                session_number: dto.session_number
            }
        });

        if (existingSession) {
            throw new BadRequestException(`Session number ${dto.session_number} already exists`);
        }

        // Validate date is in future
        const sessionDate = new Date(dto.scheduled_date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (sessionDate < today) {
            throw new BadRequestException('Session date must be in the future');
        }

        // Create session (group of lessons) - no longer has scheduled_date, start_time, end_time
        const session = this.sessionRepository.create({
            course_id: courseId,
            session_number: dto.session_number,
            title: dto.title,
            description: dto.description,
            total_lessons: 0, // Will be updated when lessons are added
            status: SessionStatus.DRAFT,
        });

        const savedSession = await this.sessionRepository.save(session);

        // Update course total_sessions
        await this.courseRepository.update(courseId, {
            total_sessions: () => 'total_sessions + 1'
        });

        this.logger.log(`✅ Session added to course ${courseId}: Session #${dto.session_number}`);

        // Ensure we return a single session, not an array
        return Array.isArray(savedSession) ? savedSession[0] : savedSession;
    }

    private calculateDurationMinutes(startTime: string, endTime: string): number {
        const [startHours, startMinutes] = startTime.split(':').map(Number);
        const [endHours, endMinutes] = endTime.split(':').map(Number);
        
        const startTotalMinutes = startHours * 60 + startMinutes;
        const endTotalMinutes = endHours * 60 + endMinutes;
        
        return endTotalMinutes - startTotalMinutes;
    }

    async getCourseSessions(courseId: string): Promise<CourseSession[]> {
        await this.getCourseById(courseId);

        const sessions = await this.sessionRepository.find({
            where: { course_id: courseId },
            order: { session_number: 'ASC' },
        });

        return sessions;
    }

    async getSessionById(sessionId: string): Promise<CourseSession> {
        const session = await this.sessionRepository.findOne({
            where: { id: sessionId },
            relations: ['course', 'course.teacher'],
        });

        if (!session) {
            throw new NotFoundException('Session not found');
        }

        return session;
    }

    async updateSession(
        sessionId: string,
        teacherId: string,
        dto: UpdateSessionDto
    ): Promise<CourseSession> {
        const session = await this.getSessionById(sessionId);

        if (session.course.teacher_id !== teacherId) {
            throw new ForbiddenException('You can only update sessions of your own courses');
        }

        // If times are updated, recalculate duration
        const updateData: any = { ...dto };
        // Session no longer has start_time, end_time, scheduled_date
        // These are now properties of Lesson, not Session

        await this.sessionRepository.update(sessionId, updateData);

        this.logger.log(`✏️ Session updated: ${sessionId}`);

        return this.getSessionById(sessionId);
    }

    async deleteSession(sessionId: string, teacherId: string): Promise<void> {
        const session = await this.getSessionById(sessionId);

        if (session.course.teacher_id !== teacherId) {
            throw new ForbiddenException('You can only delete sessions of your own courses');
        }

        const courseId = session.course_id;

        await this.sessionRepository.delete(sessionId);

        // Update course total_sessions
        const course = await this.courseRepository.findOne({ where: { id: courseId } });
        if (course) {
            const newTotalSessions = Math.max(0, course.total_sessions - 1);
            await this.courseRepository.update(courseId, {
                total_sessions: newTotalSessions
            });
        }

        this.logger.log(`🗑️ Session deleted: ${sessionId}`);
    }

    async regenerateQrCode(courseId: string, teacherId: string): Promise<Course> {
        const course = await this.getCourseById(courseId);

        if (course.teacher_id !== teacherId) {
            throw new ForbiddenException('You can only regenerate QR code for your own courses');
        }

        const frontendUrl = this.configService.get('FRONTEND_URL') || 'http://localhost:3001';
        const shareLink = `${frontendUrl}/courses/${courseId}`;

        try {
            const qrCodeDataUrl = await this.qrCodeService.generateDataUrl(shareLink);

            await this.courseRepository.update(courseId, {
                share_link: shareLink,
                qr_code_url: qrCodeDataUrl,
            });

            course.share_link = shareLink;
            course.qr_code_url = qrCodeDataUrl;

            this.logger.log(`🔄 QR code regenerated for course: ${courseId}`);
        } catch (error) {
            this.logger.error(`Failed to regenerate QR code: ${error.message}`);
            throw new BadRequestException('Failed to regenerate QR code');
        }

        return course;
    }

    private generateAffiliateCode(): string {
        const timestamp = Date.now().toString(36);
        const random = Math.random().toString(36).substring(2, 8);
        return `COURSE_${timestamp}${random}`.toUpperCase();
    }

    async getTeacherCourses(
        teacherId: string,
        status?: CourseStatus
    ): Promise<Course[]> {
        const where: FindOptionsWhere<Course> = { teacher_id: teacherId };
        if (status) where.status = status;

        const courses = await this.courseRepository.find({
            where,
            relations: ['sessions'],
            order: { created_at: 'DESC' },
        });

        return courses;
    }

    async publishCourse(courseId: string, teacherId: string): Promise<Course> {
        const course = await this.getCourseById(courseId, teacherId);

        if (course.teacher_id !== teacherId) {
            throw new ForbiddenException('You can only publish your own courses');
        }

        // TODO: Re-enable these validations after testing
        // Check has at least 1 session
        // if (course.total_sessions === 0 || !course.sessions || course.sessions.length === 0) {
        //     throw new BadRequestException('Course must have at least one session to be published');
        // }

        // Check pricing is set
        // if (!course.price_full_course && !course.price_per_session) {
        //     throw new BadRequestException('Course must have pricing set (full course or per session)');
        // }

        // Update course status
        course.status = CourseStatus.PUBLISHED;
        course.is_published = true;

        const updated = await this.courseRepository.save(course);

        this.logger.log(`📢 Course published: ${courseId}`);

        return updated;
    }

    async unpublishCourse(courseId: string, teacherId: string): Promise<Course> {
        const course = await this.getCourseById(courseId, teacherId);

        if (course.teacher_id !== teacherId) {
            throw new ForbiddenException('You can only unpublish your own courses');
        }

        // Update course status
        course.is_published = false;
        // Optionally set status back to DRAFT
        if (course.status === CourseStatus.PUBLISHED) {
            course.status = CourseStatus.DRAFT;
        }

        const updated = await this.courseRepository.save(course);

        this.logger.log(`🔒 Course unpublished: ${courseId}`);

        return updated;
    }

    async createCourseWithSessions(
        teacherId: string,
        dto: CreateCourseWithSessionsDto,
    ): Promise<Course> {
        this.logger.log(`Creating course with sessions for teacher: ${teacherId}`);

        try {
            // Validate teacher
            const teacher = await this.userRepository.findOne({
                where: { id: teacherId }
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
            if (dto.price_per_session && dto.price_per_session > 0) {
                priceType = PriceType.PER_SESSION;
            } else if (dto.price_full_course && dto.price_full_course > 0) {
                priceType = PriceType.FULL_COURSE;
            } else {
                // Default to PER_SESSION if no price provided
                priceType = PriceType.PER_SESSION;
            }

            // 1. Create course
            const affiliateCode = this.generateAffiliateCode();
            const course = manager.create(Course, {
                teacher_id: teacherId,
                title: dto.title,
                description: dto.description,
                category: dto.category as CourseCategory | undefined,
                tags: dto.tags,
                level: dto.level,
                language: dto.language,
                price_type: priceType,
                price_full_course: dto.price_full_course,
                price_per_session: dto.price_per_session,
                max_students: dto.max_students || 30,
                duration_hours: dto.duration_hours,
                total_sessions: dto.sessions.length,
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
                this.logger.error(`Failed to generate QR code for course ${savedCourse.id}: ${error.message}`);
            }

            // 2. Create sessions with lessons
            for (const sessionDto of dto.sessions) {
                // Create session (group of lessons)
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
                        this.logger.log(`Creating lesson ${lessonDto.lesson_number} for session ${sessionDto.session_number}`);
                        
                        // Validate time format and logic
                        if (lessonDto.end_time <= lessonDto.start_time) {
                            throw new BadRequestException(`End time (${lessonDto.end_time}) must be after start time (${lessonDto.start_time}) for lesson ${lessonDto.lesson_number}`);
                        }
                        
                        // Calculate duration
                        const duration = this.calculateDurationMinutes(
                            lessonDto.start_time,
                            lessonDto.end_time,
                        );
                        
                        if (duration <= 0) {
                            throw new BadRequestException(`Invalid duration calculated for lesson ${lessonDto.lesson_number}`);
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
                            lesson_id: undefined, // Will be set after lesson is created
                            course_id: savedCourse.id,
                            session_id: savedSession.id,
                            teacher_name: teacher.username,
                            subject_name: savedCourse.title,
                            scheduled_at: scheduledDateTime,
                            max_participants: savedCourse.max_students,
                            meeting_type: MeetingType.TEACHER_CLASS,
                            status: MeetingStatus.SCHEDULED,
                            settings: {
                                allow_screen_share: true,
                                allow_chat: true,
                                allow_reactions: true,
                                record_meeting: true,
                            },
                        });

                        const savedMeeting = await manager.save(Meeting, meeting);
                        this.logger.log(`Meeting created: ${savedMeeting.id}`);

                        // 5. Create Lesson
                        const lessonLink = `${frontendUrl}/courses/${savedCourse.id}/sessions/${sessionDto.session_number}/lessons/${lessonDto.lesson_number}`;
                        const qrData = {
                            course_id: savedCourse.id,
                            session_id: savedSession.id,
                            lesson_id: null, // Will be set after save
                            lesson_number: lessonDto.lesson_number,
                            title: lessonDto.title,
                            date: lessonDto.scheduled_date,
                            time: lessonDto.start_time,
                            room: livekitRoomName,
                            meeting_id: savedMeeting.id,
                            qr_code_link: lessonLink, // Store link for generating QR code on-demand
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
                            meeting_link: `${frontendUrl}/meeting/${savedMeeting.id}`,
                            qr_code_url: undefined, // Don't store data URL - it's too long for VARCHAR(500)
                            qr_code_data: JSON.stringify(qrData), // Store link and data in JSON instead
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
                        this.logger.error(`Error creating lesson ${lessonDto.lesson_number}: ${lessonError.message}`, lessonError.stack);
                        throw lessonError;
                    }
                }
            }

            // Return course with sessions, lessons, and materials
            // Use the same manager to ensure we're in the same transaction
            const finalCourse = await manager.findOne(Course, {
                where: { id: savedCourse.id },
                relations: [
                    'teacher',
                    'sessions',
                    'sessions.lessons',
                    'sessions.lessons.materials',
                    'sessions.lessons.meeting',
                ],
            });

            if (!finalCourse) {
                this.logger.error(`Course ${savedCourse.id} not found after creation - transaction may have rolled back`);
                throw new NotFoundException('Course not found after creation');
            }

            this.logger.log(`✅ Course created with ${dto.sessions.length} sessions: ${savedCourse.id}`);
            return finalCourse;
            });
        } catch (error) {
            this.logger.error(`Error creating course with sessions: ${error.message}`, error.stack);
            throw error;
        }
    }

    // ==================== LESSON METHODS ====================

    async getLessonById(lessonId: string): Promise<Lesson> {
        const lesson = await this.lessonRepository.findOne({
            where: { id: lessonId },
            relations: ['session', 'session.course', 'materials', 'meeting'],
        });

        if (!lesson) {
            throw new NotFoundException(`Lesson with ID ${lessonId} not found`);
        }

        return lesson;
    }

    async getSessionLessons(sessionId: string): Promise<Lesson[]> {
        const session = await this.sessionRepository.findOne({
            where: { id: sessionId },
        });

        if (!session) {
            throw new NotFoundException(`Session with ID ${sessionId} not found`);
        }

        return this.lessonRepository.find({
            where: { session_id: sessionId },
            relations: ['materials', 'meeting'],
            order: { lesson_number: 'ASC' },
        });
    }

    async addLesson(sessionId: string, teacherId: string, dto: CreateLessonDto): Promise<Lesson> {
        const session = await this.sessionRepository.findOne({
            where: { id: sessionId },
            relations: ['course'],
        });

        if (!session) {
            throw new NotFoundException(`Session with ID ${sessionId} not found`);
        }

        if (session.course.teacher_id !== teacherId) {
            throw new ForbiddenException('You can only add lessons to your own course sessions');
        }

        // Validate time format and logic
        if (dto.end_time <= dto.start_time) {
            throw new BadRequestException('End time must be after start time');
        }

        // Calculate duration
        const duration = this.calculateDurationMinutes(dto.start_time, dto.end_time);

        // Generate LiveKit room name
        const livekitRoomName = `course_${session.course_id}_session_${session.session_number}_lesson_${dto.lesson_number}`;

        // Generate meeting title
        const meetingTitle = `${session.course.title} - ${session.title} - ${dto.title}`;

        // Get teacher
        const teacher = await this.userRepository.findOne({
            where: { id: teacherId },
        });

        if (!teacher) {
            throw new NotFoundException('Teacher not found');
        }

        return await this.dataSource.transaction(async (manager) => {
            // Create Meeting first
            const scheduledDateTime = new Date(`${dto.scheduled_date} ${dto.start_time}`);
            const meeting = manager.create(Meeting, {
                title: meetingTitle,
                description: dto.description,
                host: teacher,
                lesson_id: undefined,
                course_id: session.course_id,
                session_id: sessionId,
                teacher_name: teacher.username,
                subject_name: session.course.title,
                scheduled_at: scheduledDateTime,
                max_participants: session.course.max_students,
                meeting_type: MeetingType.TEACHER_CLASS,
                status: MeetingStatus.SCHEDULED,
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
            const lessonLink = `${frontendUrl}/courses/${session.course_id}/sessions/${session.session_number}/lessons/${dto.lesson_number}`;
            const qrData = {
                course_id: session.course_id,
                session_id: sessionId,
                lesson_id: null,
                lesson_number: dto.lesson_number,
                title: dto.title,
                date: dto.scheduled_date,
                time: dto.start_time,
                room: livekitRoomName,
                meeting_id: savedMeeting.id,
                qr_code_link: lessonLink, // Store link for generating QR code on-demand
            };

            // Create Lesson
            const lesson = manager.create(Lesson, {
                session_id: sessionId,
                lesson_number: dto.lesson_number,
                title: dto.title,
                description: dto.description,
                scheduled_date: new Date(dto.scheduled_date),
                start_time: dto.start_time,
                end_time: dto.end_time,
                duration_minutes: duration,
                meeting_id: savedMeeting.id,
                livekit_room_name: livekitRoomName,
                meeting_link: `${frontendUrl}/meeting/${savedMeeting.id}`,
                qr_code_url: undefined, // Don't store data URL - it's too long for VARCHAR(500)
                qr_code_data: JSON.stringify(qrData), // Store link and data in JSON instead
                status: LessonStatus.SCHEDULED,
            });

            const savedLesson = await manager.save(Lesson, lesson);

            // Update Meeting with lesson_id
            await manager.update(Meeting, savedMeeting.id, {
                lesson_id: savedLesson.id,
            });

            // Create materials
            if (dto.materials && dto.materials.length > 0) {
                for (const materialDto of dto.materials) {
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

            // Update session total_lessons
            await manager.update(CourseSession, sessionId, {
                total_lessons: () => 'total_lessons + 1',
            });

            const finalLesson = await manager.findOne(Lesson, {
                where: { id: savedLesson.id },
                relations: ['materials', 'meeting'],
            });

            if (!finalLesson) {
                throw new NotFoundException('Lesson not found after creation');
            }

            return finalLesson;
        });
    }

    async updateLesson(lessonId: string, teacherId: string, dto: UpdateLessonDto): Promise<Lesson> {
        const lesson = await this.getLessonById(lessonId);

        if (lesson.session.course.teacher_id !== teacherId) {
            throw new ForbiddenException('You can only update lessons of your own courses');
        }

        const updateData: any = {};

        if (dto.title !== undefined) updateData.title = dto.title;
        if (dto.description !== undefined) updateData.description = dto.description;
        if (dto.scheduled_date !== undefined) updateData.scheduled_date = new Date(dto.scheduled_date);
        if (dto.start_time !== undefined) updateData.start_time = dto.start_time;
        if (dto.end_time !== undefined) updateData.end_time = dto.end_time;

        // Recalculate duration if times are updated
        if (dto.start_time && dto.end_time) {
            if (dto.end_time <= dto.start_time) {
                throw new BadRequestException('End time must be after start time');
            }
            updateData.duration_minutes = this.calculateDurationMinutes(dto.start_time, dto.end_time);
        } else if (dto.start_time && !dto.end_time) {
            if (lesson.end_time <= dto.start_time) {
                throw new BadRequestException('End time must be after start time');
            }
            updateData.duration_minutes = this.calculateDurationMinutes(dto.start_time, lesson.end_time);
        } else if (dto.end_time && !dto.start_time) {
            if (dto.end_time <= lesson.start_time) {
                throw new BadRequestException('End time must be after start time');
            }
            updateData.duration_minutes = this.calculateDurationMinutes(lesson.start_time, dto.end_time);
        }

        await this.lessonRepository.update(lessonId, updateData);

        this.logger.log(`✏️ Lesson updated: ${lessonId}`);

        return this.getLessonById(lessonId);
    }

    async deleteLesson(lessonId: string, teacherId: string): Promise<void> {
        const lesson = await this.getLessonById(lessonId);

        if (lesson.session.course.teacher_id !== teacherId) {
            throw new ForbiddenException('You can only delete lessons of your own courses');
        }

        const sessionId = lesson.session_id;

        await this.lessonRepository.delete(lessonId);

        // Update session total_lessons
        const session = await this.sessionRepository.findOne({ where: { id: sessionId } });
        if (session) {
            const newTotalLessons = Math.max(0, session.total_lessons - 1);
            await this.sessionRepository.update(sessionId, {
                total_lessons: newTotalLessons,
            });
        }

        this.logger.log(`🗑️ Lesson deleted: ${lessonId}`);
    }

    async getCourseMeetings(courseId: string): Promise<Meeting[]> {
        // Verify course exists
        const course = await this.courseRepository.findOne({
            where: { id: courseId },
        });

        if (!course) {
            throw new NotFoundException('Course not found');
        }

        // Get all meetings for this course
        const meetings = await this.meetingRepository.find({
            where: { course_id: courseId },
            relations: ['host', 'lesson', 'session'],
            order: { scheduled_at: 'ASC' },
        });

        this.logger.log(`Found ${meetings.length} meetings for course ${courseId}`);
        return meetings;
    }
}
