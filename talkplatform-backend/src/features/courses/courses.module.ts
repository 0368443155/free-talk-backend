import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { CoursesController } from './courses.controller';
import { CoursesService } from './courses.service';
import { EnrollmentController } from './enrollment.controller';
import { EnrollmentService } from './enrollment.service';
import { Course } from './entities/course.entity';
import { CourseSession } from './entities/course-session.entity';
import { SessionMaterial } from './entities/session-material.entity';
import { Lesson } from './entities/lesson.entity';
import { LessonMaterial } from './entities/lesson-material.entity';
import { CourseEnrollment } from './entities/enrollment.entity';
import { SessionPurchase } from './entities/session-purchase.entity';
import { PaymentHold } from './entities/payment-hold.entity';
import { User } from '../../users/user.entity';
import { QrCodeService } from '../../common/services/qr-code.service';
import { Meeting } from '../meeting/entities/meeting.entity';

@Module({
    imports: [
        TypeOrmModule.forFeature([
            Course,
            CourseSession,
            SessionMaterial,
            Lesson,
            LessonMaterial,
            CourseEnrollment,
            SessionPurchase,
            PaymentHold,
            User,
            Meeting,
        ]),
        ConfigModule,
    ],
    controllers: [CoursesController, EnrollmentController],
    providers: [CoursesService, EnrollmentService, QrCodeService],
    exports: [CoursesService, EnrollmentService],
})
export class CoursesModule { }
