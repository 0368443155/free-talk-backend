import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { CqrsModule } from '@nestjs/cqrs';
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
import { MeetingsModule } from '../meeting/meetings.module';
import { CourseAccessGuard } from './guards/course-access.guard';

// Command Handlers
import { CreateCourseHandler } from './application/handlers/create-course.handler';
import { CreateCourseWithSessionsHandler } from './application/handlers/create-course-with-sessions.handler';
import { UpdateCourseHandler } from './application/handlers/update-course.handler';
import { DeleteCourseHandler } from './application/handlers/delete-course.handler';
import { PublishCourseHandler } from './application/handlers/publish-course.handler';
import { UnpublishCourseHandler } from './application/handlers/unpublish-course.handler';
import { AddSessionHandler } from './application/handlers/add-session.handler';
import { UpdateSessionHandler } from './application/handlers/update-session.handler';
import { DeleteSessionHandler } from './application/handlers/delete-session.handler';
import { AddLessonHandler } from './application/handlers/add-lesson.handler';
import { UpdateLessonHandler } from './application/handlers/update-lesson.handler';
import { DeleteLessonHandler } from './application/handlers/delete-lesson.handler';
import { RegenerateQrCodeHandler } from './application/handlers/regenerate-qr-code.handler';

// Query Handlers
import { GetCoursesHandler } from './application/handlers/get-courses.handler';
import { GetCourseDetailsHandler } from './application/handlers/get-course-details.handler';
import { GetTeacherCoursesHandler } from './application/handlers/get-teacher-courses.handler';
import { GetCourseSessionsHandler } from './application/handlers/get-course-sessions.handler';
import { GetSessionByIdHandler } from './application/handlers/get-session-by-id.handler';
import { GetSessionLessonsHandler } from './application/handlers/get-session-lessons.handler';
import { GetLessonByIdHandler } from './application/handlers/get-lesson-by-id.handler';
import { GetLessonMaterialsHandler } from './application/handlers/get-lesson-materials.handler';
import { GetLessonMaterialByIdHandler } from './application/handlers/get-lesson-material-by-id.handler';
import { CheckLessonMaterialAccessHandler } from './application/handlers/check-lesson-material-access.handler';
import { GetCourseMeetingsHandler } from './application/handlers/get-course-meetings.handler';

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
        CqrsModule,
        forwardRef(() => MeetingsModule),
    ],
    controllers: [CoursesController, EnrollmentController],
    providers: [
        CoursesService,
        EnrollmentService,
        QrCodeService,
        CourseAccessGuard,
        // Command Handlers
        CreateCourseHandler,
        CreateCourseWithSessionsHandler,
        UpdateCourseHandler,
        DeleteCourseHandler,
        PublishCourseHandler,
        UnpublishCourseHandler,
        AddSessionHandler,
        UpdateSessionHandler,
        DeleteSessionHandler,
        AddLessonHandler,
        UpdateLessonHandler,
        DeleteLessonHandler,
        RegenerateQrCodeHandler,
        // Query Handlers
        GetCoursesHandler,
        GetCourseDetailsHandler,
        GetTeacherCoursesHandler,
        GetCourseSessionsHandler,
        GetSessionByIdHandler,
        GetSessionLessonsHandler,
        GetLessonByIdHandler,
        GetLessonMaterialsHandler,
        GetLessonMaterialByIdHandler,
        CheckLessonMaterialAccessHandler,
        GetCourseMeetingsHandler,
    ],
    exports: [CoursesService, EnrollmentService],
})
export class CoursesModule { }

// Export guard for use in other modules
export { CourseAccessGuard } from './guards/course-access.guard';
