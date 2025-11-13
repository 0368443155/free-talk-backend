import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TeacherProfile } from './teacher-profile.entity';
import { TeachersService } from './teachers.service';
import { TeachersController } from './teachers.controller';
import { User } from 'src/users/user.entity';
import { UsersModule } from 'src/users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([TeacherProfile, User]), // Import TeacherProfile entity
    UsersModule
  ],
  providers: [TeachersService],
  controllers: [TeachersController],
  exports: [TeachersService], // Sẽ export service sau
})
export class TeachersModule {}