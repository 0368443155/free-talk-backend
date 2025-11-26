import {
    Injectable,
    NotFoundException,
    BadRequestException,
    ForbiddenException,
    Logger
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere } from 'typeorm';
import { Course, CourseStatus, PriceType } from './entities/course.entity';
import { CourseSession, SessionStatus } from './entities/course-session.entity';
import { User, UserRole } from '../../users/user.entity';
import { CreateCourseDto, UpdateCourseDto, GetCoursesQueryDto } from './dto/course.dto';
import { CreateSessionDto, UpdateSessionDto } from './dto/session.dto';
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
        @InjectRepository(User)
        private readonly userRepository: Repository<User>,
        private readonly qrCodeService: QrCodeService,
        private readonly configService: ConfigService,
    ) { }

    async createCourse(teacherId: string, dto: CreateCourseDto): Promise<Course> {
        const teacher = await this.userRepository.findOne({
            where: { id: teacherId, role: UserRole.TEACHER }
        });

        if (!teacher) {
            throw new ForbiddenException('Only teachers can create courses');
        }

        if (dto.price_type === PriceType.PER_SESSION && (!dto.price_per_session || dto.price_per_session < 1)) {
            throw new BadRequestException('Price per session must be at least $1.00');
        }

        if (dto.price_type === PriceType.FULL_COURSE && (!dto.price_full_course || dto.price_full_course < 1)) {
            throw new BadRequestException('Full course price must be at least $1.00');
        }

        const affiliateCode = this.generateAffiliateCode();

        const course = this.courseRepository.create({
            teacher_id: teacherId,
            ...dto,
            affiliate_code: affiliateCode,
            status: CourseStatus.UPCOMING,
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
            page = 1,
            limit = 20
        } = query;

        const where: FindOptionsWhere<Course> = {};

        if (teacher_id) where.teacher_id = teacher_id;
        if (status) where.status = status as CourseStatus;
        if (language) where.language = language;
        if (level) where.level = level as any;
        if (category) where.category = category;

        const [data, total] = await this.courseRepository.findAndCount({
            where,
            relations: ['teacher', 'sessions'],
            order: { created_at: 'DESC' },
            skip: (page - 1) * limit,
            take: limit,
        });

        return {
            data,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };
    }

    async getCourseById(courseId: string): Promise<Course> {
        const course = await this.courseRepository.findOne({
            where: { id: courseId },
            relations: ['teacher', 'sessions'],
        });

        if (!course) {
            throw new NotFoundException('Course not found');
        }

        return course;
    }

    async updateCourse(
        courseId: string,
        teacherId: string,
        dto: UpdateCourseDto
    ): Promise<Course> {
        const course = await this.getCourseById(courseId);

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

        return this.getCourseById(courseId);
    }

    async deleteCourse(courseId: string, teacherId: string): Promise<void> {
        const course = await this.getCourseById(courseId);

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
        const course = await this.getCourseById(courseId);

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

        if (dto.end_time <= dto.start_time) {
            throw new BadRequestException('End time must be after start time');
        }

        const livekitRoomName = `course_${courseId}_session_${dto.session_number}`;

        const session = this.sessionRepository.create({
            course_id: courseId,
            ...dto,
            livekit_room_name: livekitRoomName,
            status: SessionStatus.SCHEDULED,
        });

        const savedSession = await this.sessionRepository.save(session);

        this.logger.log(`✅ Session added to course ${courseId}: Session #${dto.session_number}`);

        return savedSession;
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

        if (dto.start_time && dto.end_time && dto.end_time <= dto.start_time) {
            throw new BadRequestException('End time must be after start time');
        }

        await this.sessionRepository.update(sessionId, dto);

        this.logger.log(`✏️ Session updated: ${sessionId}`);

        return this.getSessionById(sessionId);
    }

    async deleteSession(sessionId: string, teacherId: string): Promise<void> {
        const session = await this.getSessionById(sessionId);

        if (session.course.teacher_id !== teacherId) {
            throw new ForbiddenException('You can only delete sessions of your own courses');
        }

        await this.sessionRepository.delete(sessionId);

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
}
