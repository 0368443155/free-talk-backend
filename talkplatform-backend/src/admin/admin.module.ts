import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { User } from '../users/user.entity';
import { TeacherProfile } from '../teachers/teacher-profile.entity';
import { RedisModule } from '@nestjs-modules/ioredis';

@Module({
  imports: [TypeOrmModule.forFeature([User, TeacherProfile]), RedisModule],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
