import {
    Injectable,
    NotFoundException,
    BadRequestException,
    InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { CourseEnrollment, EnrollmentType, EnrollmentStatus, PaymentStatus } from './entities/enrollment.entity';
import { SessionPurchase, PurchaseStatus } from './entities/session-purchase.entity';
import { PaymentHold, HoldStatus } from './entities/payment-hold.entity';
import { Course } from './entities/course.entity';
import { CourseSession } from './entities/course-session.entity';
import { Lesson } from './entities/lesson.entity';
import { LessonMaterial } from './entities/lesson-material.entity';
import { User } from '../../users/user.entity';
import { EnrollCourseDto, PurchaseSessionDto } from './dto/enrollment.dto';

@Injectable()
export class EnrollmentService {
    constructor(
        @InjectRepository(CourseEnrollment)
        private enrollmentRepository: Repository<CourseEnrollment>,
        @InjectRepository(SessionPurchase)
        private sessionPurchaseRepository: Repository<SessionPurchase>,
        @InjectRepository(PaymentHold)
        private paymentHoldRepository: Repository<PaymentHold>,
        @InjectRepository(Course)
        private courseRepository: Repository<Course>,
        @InjectRepository(CourseSession)
        private sessionRepository: Repository<CourseSession>,
        @InjectRepository(Lesson)
        private lessonRepository: Repository<Lesson>,
        @InjectRepository(LessonMaterial)
        private lessonMaterialRepository: Repository<LessonMaterial>,
        @InjectRepository(User)
        private userRepository: Repository<User>,
        private dataSource: DataSource,
    ) { }

    /**
     * Enroll in full course
     */
    async enrollFullCourse(userId: string, courseId: string, dto: EnrollCourseDto) {
        return await this.dataSource.transaction(async (manager) => {
            // 1. Get course with teacher info
            const course = await manager.findOne(Course, {
                where: { id: courseId },
                relations: ['teacher'],
            });

            if (!course) {
                throw new NotFoundException('Course not found');
            }

            // 2. Check if already enrolled
            const existing = await manager.findOne(CourseEnrollment, {
                where: { user_id: userId, course_id: courseId },
            });

            if (existing) {
                throw new BadRequestException('Already enrolled in this course');
            }

            // 3. Get price
            const price = course.price_full_course;
            if (!price || price < 1) {
                throw new BadRequestException('Course does not support full course purchase');
            }

            // 4. Check user credit
            const user = await manager.findOne(User, { where: { id: userId } });
            if (!user) {
                throw new NotFoundException('User not found');
            }

            if (user.credit_balance < price) {
                throw new BadRequestException('Insufficient credit balance');
            }

            // 5. Deduct credit from student
            await manager.update(User, userId, {
                credit_balance: () => `credit_balance - ${price}`,
            });

            // 6. Create enrollment
            const enrollment = await manager.save(CourseEnrollment, {
                user_id: userId,
                course_id: courseId,
                enrollment_type: EnrollmentType.FULL_COURSE,
                total_price_paid: price,
                payment_status: PaymentStatus.PAID,
                status: EnrollmentStatus.ACTIVE,
            });

            // 7. Hold payment
            await manager.save(PaymentHold, {
                enrollment_id: enrollment.id,
                teacher_id: course.teacher_id,
                student_id: userId,
                amount: price,
                status: HoldStatus.HELD,
            });

            // 8. Update course student count
            await manager.update(Course, courseId, {
                current_students: () => 'current_students + 1',
            });

            // Return enrollment with course info
            return await manager.findOne(CourseEnrollment, {
                where: { id: enrollment.id },
                relations: ['course'],
            });
        });
    }

    /**
     * Purchase single session
     */
    async purchaseSession(userId: string, sessionId: string) {
        return await this.dataSource.transaction(async (manager) => {
            // 1. Get session with course and teacher
            const session = await manager.findOne(CourseSession, {
                where: { id: sessionId },
                relations: ['course', 'course.teacher'],
            });

            if (!session) {
                throw new NotFoundException('Session not found');
            }

            const course = session.course;

            // 2. Check if already purchased
            const existing = await manager.findOne(SessionPurchase, {
                where: { user_id: userId, session_id: sessionId },
            });

            if (existing) {
                throw new BadRequestException('Already purchased this session');
            }

            // 3. Get price
            const price = course.price_per_session;
            if (!price || price < 1) {
                throw new BadRequestException('Course does not support per-session purchase');
            }

            // 4. Check user credit
            const user = await manager.findOne(User, { where: { id: userId } });
            if (!user) {
                throw new NotFoundException('User not found');
            }

            if (user.credit_balance < price) {
                throw new BadRequestException('Insufficient credit balance');
            }

            // 5. Deduct credit
            await manager.update(User, userId, {
                credit_balance: () => `credit_balance - ${price}`,
            });

            // 6. Create purchase record
            const purchase = await manager.save(SessionPurchase, {
                user_id: userId,
                course_id: course.id,
                session_id: sessionId,
                price_paid: price,
                payment_status: 'paid',
                status: PurchaseStatus.ACTIVE,
            });

            // 7. Hold payment
            await manager.save(PaymentHold, {
                session_purchase_id: purchase.id,
                teacher_id: course.teacher_id,
                student_id: userId,
                amount: price,
                status: HoldStatus.HELD,
            });

            // Return purchase with session info
            return await manager.findOne(SessionPurchase, {
                where: { id: purchase.id },
                relations: ['session', 'course'],
            });
        });
    }

    /**
     * Cancel enrollment (refund)
     */
    async cancelEnrollment(userId: string, enrollmentId: string) {
        return await this.dataSource.transaction(async (manager) => {
            const enrollment = await manager.findOne(CourseEnrollment, {
                where: { id: enrollmentId, user_id: userId },
                relations: ['course'],
            });

            if (!enrollment) {
                throw new NotFoundException('Enrollment not found');
            }

            if (enrollment.status === EnrollmentStatus.CANCELLED) {
                throw new BadRequestException('Enrollment already cancelled');
            }

            // Find payment hold
            const hold = await manager.findOne(PaymentHold, {
                where: { enrollment_id: enrollmentId, status: HoldStatus.HELD },
            });

            if (!hold) {
                throw new BadRequestException('Payment already processed');
            }

            // Refund to student
            await manager.update(User, userId, {
                credit_balance: () => `credit_balance + ${hold.amount}`,
            });

            // Update enrollment
            await manager.update(CourseEnrollment, enrollmentId, {
                status: EnrollmentStatus.CANCELLED,
                cancelled_at: new Date(),
                refund_amount: hold.amount,
            });

            // Update hold
            await manager.update(PaymentHold, hold.id, {
                status: HoldStatus.REFUNDED,
                released_at: new Date(),
            });

            // Update course student count
            await manager.update(Course, enrollment.course_id, {
                current_students: () => 'current_students - 1',
            });

            return { message: 'Enrollment cancelled and refunded successfully' };
        });
    }

    /**
     * Cancel session purchase (refund)
     */
    async cancelSessionPurchase(userId: string, purchaseId: string) {
        return await this.dataSource.transaction(async (manager) => {
            const purchase = await manager.findOne(SessionPurchase, {
                where: { id: purchaseId, user_id: userId },
            });

            if (!purchase) {
                throw new NotFoundException('Purchase not found');
            }

            if (purchase.status === PurchaseStatus.CANCELLED) {
                throw new BadRequestException('Purchase already cancelled');
            }

            if (purchase.attended) {
                throw new BadRequestException('Cannot cancel attended session');
            }

            // Find payment hold
            const hold = await manager.findOne(PaymentHold, {
                where: { session_purchase_id: purchaseId, status: HoldStatus.HELD },
            });

            if (!hold) {
                throw new BadRequestException('Payment already processed');
            }

            // Refund to student
            await manager.update(User, userId, {
                credit_balance: () => `credit_balance + ${hold.amount}`,
            });

            // Update purchase
            await manager.update(SessionPurchase, purchaseId, {
                status: PurchaseStatus.CANCELLED,
                cancelled_at: new Date(),
                refund_amount: hold.amount,
            });

            // Update hold
            await manager.update(PaymentHold, hold.id, {
                status: HoldStatus.REFUNDED,
                released_at: new Date(),
            });

            return { message: 'Session purchase cancelled and refunded successfully' };
        });
    }

    /**
     * Get student's enrollments
     */
    async getMyEnrollments(userId: string) {
        return await this.enrollmentRepository.find({
            where: { user_id: userId },
            relations: ['course', 'course.teacher'],
            order: { created_at: 'DESC' },
        });
    }

    /**
     * Get student's session purchases
     */
    async getMySessionPurchases(userId: string) {
        return await this.sessionPurchaseRepository.find({
            where: { user_id: userId },
            relations: ['session', 'course', 'course.teacher'],
            order: { created_at: 'DESC' },
        });
    }

    /**
     * Check if user has access to session
     */
    async hasAccessToSession(userId: string, sessionId: string): Promise<boolean> {
        const session = await this.sessionRepository.findOne({
            where: { id: sessionId },
            relations: ['course'],
        });

        if (!session) return false;

        // Check if user is the teacher (owner of the course)
        if (session.course.teacher_id === userId) {
            return true;
        }

        // Check if enrolled in full course
        const enrollment = await this.enrollmentRepository.findOne({
            where: {
                user_id: userId,
                course_id: session.course_id,
                status: EnrollmentStatus.ACTIVE,
            },
        });

        if (enrollment) return true;

        // Check if purchased this session
        const purchase = await this.sessionPurchaseRepository.findOne({
            where: {
                user_id: userId,
                session_id: sessionId,
                status: PurchaseStatus.ACTIVE,
            },
        });

        return !!purchase;
    }

    /**
     * Check if user has access to lesson
     */
    async hasAccessToLesson(userId: string, lessonId: string): Promise<{
        hasAccess: boolean;
        reason?: string;
        requiresPurchase?: boolean;
    }> {
        const lesson = await this.lessonRepository.findOne({
            where: { id: lessonId },
            relations: ['session', 'session.course'],
        });

        if (!lesson) {
            return { hasAccess: false, reason: 'Lesson not found' };
        }

        // Check if lesson is free or preview
        if (lesson.is_free || lesson.is_preview) {
            return { hasAccess: true, reason: 'Free/Preview lesson' };
        }

        const session = lesson.session;
        const course = session.course;

        // Check if user is the teacher
        if (course.teacher_id === userId) {
            return { hasAccess: true, reason: 'Course owner' };
        }

        // Check if enrolled in full course
        const enrollment = await this.enrollmentRepository.findOne({
            where: {
                user_id: userId,
                course_id: course.id,
                status: EnrollmentStatus.ACTIVE,
            },
        });

        if (enrollment) {
            return { hasAccess: true, reason: 'Enrolled in course' };
        }

        // Check if purchased this specific session
        const purchase = await this.sessionPurchaseRepository.findOne({
            where: {
                user_id: userId,
                session_id: session.id,
                status: PurchaseStatus.ACTIVE,
            },
        });

        if (purchase) {
            return { hasAccess: true, reason: 'Purchased session' };
        }

        // No access
        return {
            hasAccess: false,
            reason: 'Purchase required',
            requiresPurchase: true,
        };
    }

    /**
     * Check if user has access to material
     */
    async hasAccessToMaterial(userId: string, materialId: string): Promise<boolean> {
        const material = await this.lessonMaterialRepository.findOne({
            where: { id: materialId },
            relations: ['lesson'],
        });

        if (!material) return false;

        const access = await this.hasAccessToLesson(userId, material.lesson_id);
        return access.hasAccess;
    }
}
