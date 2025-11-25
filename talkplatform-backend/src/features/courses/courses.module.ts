import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { CoursesController } from './courses.controller';
import { CoursesService } from './courses.service';
import { Course } from './entities/course.entity';
import { CourseSession } from './entities/course-session.entity';
import { User } from '../../users/user.entity';
import { QrCodeService } from '../../common/services/qr-code.service';

@Module({
    imports: [
        TypeOrmModule.forFeature([Course, CourseSession, User]),
        ConfigModule,
    ],
    controllers: [CoursesController],
    providers: [CoursesService, QrCodeService],
    exports: [CoursesService],
})
export class CoursesModule { }
