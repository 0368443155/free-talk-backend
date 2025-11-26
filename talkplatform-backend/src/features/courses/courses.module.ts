import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { CoursesController } from './courses.controller';
import { CoursesService } from './courses.service';
import { EnrollmentController } from './enrollment.controller';
import { EnrollmentService } from './enrollment.service';
import { Course } from './entities/course.entity';
import { CourseSession } from './entities/course-session.entity';
import { CourseEnrollment } from './entities/enrollment.entity';
import { SessionPurchase } from './entities/session-purchase.entity';
import { PaymentHold } from './entities/payment-hold.entity';
import { User } from '../../users/user.entity';
import { QrCodeService } from '../../common/services/qr-code.service';

@Module({
    imports: [
        TypeOrmModule.forFeature([
            Course,
            CourseSession,
            CourseEnrollment,
            SessionPurchase,
            PaymentHold,
            User,
        ]),
        ConfigModule,
    ],
    controllers: [CoursesController, EnrollmentController],
    providers: [CoursesService, EnrollmentService, QrCodeService],
    exports: [CoursesService, EnrollmentService],
})
export class CoursesModule { }
