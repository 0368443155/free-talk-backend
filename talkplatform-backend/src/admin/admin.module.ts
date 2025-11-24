import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { User } from '../users/user.entity';
import { TeacherProfile } from '../teachers/teacher-profile.entity';
import { TeacherVerification } from '../features/teachers/entities/teacher-verification.entity';
import { RedisModule } from '@nestjs-modules/ioredis';

@Module({
  imports: [TypeOrmModule.forFeature([User, TeacherProfile, TeacherVerification]), RedisModule],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
