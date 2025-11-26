import {
    Injectable,
    NotFoundException,
    BadRequestException,
    ForbiddenException,
    Logger
} from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere, DataSource } from 'typeorm';
import { Course, CourseStatus, PriceType } from './entities/course.entity';
import { CourseSession, SessionStatus } from './entities/course-session.entity';
import { SessionMaterial, MaterialType } from './entities/session-material.entity';
import { User, UserRole } from '../../users/user.entity';
import { CreateCourseDto, UpdateCourseDto, GetCoursesQueryDto, CreateCourseWithSessionsDto } from './dto/course.dto';
import { CreateSessionDto, UpdateSessionDto } from './dto/session.dto';
import { CreateSessionMaterialDto } from './dto/session-material.dto';
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
            relations: ['teacher', 'sessions'],
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

        // Validate time format and logic
        if (dto.end_time <= dto.start_time) {
            throw new BadRequestException('End time must be after start time');
        }

        // Auto-calculate duration_minutes from start_time and end_time
        const durationMinutes = this.calculateDurationMinutes(dto.start_time, dto.end_time);

        const livekitRoomName = `course_${courseId}_session_${dto.session_number}`;

        // Generate QR code data
        const frontendUrl = this.configService.get('FRONTEND_URL') || 'http://localhost:3001';
        const qrData = {
            course_id: courseId,
            session_number: dto.session_number,
            title: dto.title || `Session ${dto.session_number}`,
            date: dto.scheduled_date,
            time: dto.start_time,
            room: livekitRoomName,
        };

        let qrCodeUrl: string | null = null;
        try {
            const sessionLink = `${frontendUrl}/courses/${courseId}/sessions/${dto.session_number}`;
            qrCodeUrl = await this.qrCodeService.generateDataUrl(sessionLink);
        } catch (error) {
            this.logger.error(`Failed to generate QR code for session: ${error.message}`);
        }

        const session = this.sessionRepository.create({
            course_id: courseId,
            session_number: dto.session_number,
            title: dto.title,
            description: dto.description,
            scheduled_date: dto.scheduled_date,
            start_time: dto.start_time,
            end_time: dto.end_time,
            duration_minutes: durationMinutes,
            livekit_room_name: livekitRoomName,
            qr_code_url: qrCodeUrl || undefined,
            qr_code_data: JSON.stringify(qrData),
            status: SessionStatus.SCHEDULED,
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
        if (dto.start_time && dto.end_time) {
            if (dto.end_time <= dto.start_time) {
                throw new BadRequestException('End time must be after start time');
            }
            updateData.duration_minutes = this.calculateDurationMinutes(dto.start_time, dto.end_time);
        } else if (dto.start_time && !dto.end_time) {
            // Only start_time updated, use existing end_time
            if (session.end_time <= dto.start_time) {
                throw new BadRequestException('End time must be after start time');
            }
            updateData.duration_minutes = this.calculateDurationMinutes(dto.start_time, session.end_time);
        } else if (dto.end_time && !dto.start_time) {
            // Only end_time updated, use existing start_time
            if (dto.end_time <= session.start_time) {
                throw new BadRequestException('End time must be after start time');
            }
            updateData.duration_minutes = this.calculateDurationMinutes(session.start_time, dto.end_time);
        }

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
                category: dto.category,
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

            // 2. Create sessions with materials
            for (const sessionDto of dto.sessions) {
                // Calculate duration
                const durationMinutes = this.calculateDurationMinutes(
                    sessionDto.start_time,
                    sessionDto.end_time,
                );

                // Generate LiveKit room name
                const livekitRoomName = `course_${savedCourse.id}_session_${sessionDto.session_number}`;

                // Generate QR code data
                const qrData = {
                    course_id: savedCourse.id,
                    session_number: sessionDto.session_number,
                    title: sessionDto.title || `Session ${sessionDto.session_number}`,
                    date: sessionDto.scheduled_date,
                    time: sessionDto.start_time,
                    room: livekitRoomName,
                };

                let qrCodeUrl: string | null = null;
                try {
                    const sessionLink = `${frontendUrl}/courses/${savedCourse.id}/sessions/${sessionDto.session_number}`;
                    qrCodeUrl = await this.qrCodeService.generateDataUrl(sessionLink);
                } catch (error) {
                    this.logger.error(`Failed to generate QR code for session: ${error.message}`);
                }

                // Create session
                const session = manager.create(CourseSession, {
                    course_id: savedCourse.id,
                    session_number: sessionDto.session_number,
                    title: sessionDto.title,
                    description: sessionDto.description,
                    scheduled_date: sessionDto.scheduled_date,
                    start_time: sessionDto.start_time,
                    end_time: sessionDto.end_time,
                    duration_minutes: durationMinutes,
                    livekit_room_name: livekitRoomName,
                    qr_code_url: qrCodeUrl || undefined,
                    qr_code_data: JSON.stringify(qrData),
                    status: SessionStatus.SCHEDULED,
                });

                const savedSession = await manager.save(CourseSession, session);

                // 3. Create materials for this session
                if (sessionDto.materials && sessionDto.materials.length > 0) {
                    for (const materialDto of sessionDto.materials) {
                        const material = manager.create(SessionMaterial, {
                            session_id: savedSession.id,
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

                        await manager.save(SessionMaterial, material);
                    }
                }
            }

            // Return course with sessions and materials
            const finalCourse = await manager
                .getRepository(Course)
                .findOne({
                    where: { id: savedCourse.id },
                    relations: ['sessions', 'sessions.materials'],
                });

            if (!finalCourse) {
                throw new NotFoundException('Course not found after creation');
            }

            this.logger.log(`✅ Course created with ${dto.sessions.length} sessions: ${savedCourse.id}`);
            return finalCourse;
        });
    }
}
