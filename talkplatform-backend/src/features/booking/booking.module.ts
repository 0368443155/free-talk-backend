import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BookingController } from './booking.controller';
import { BookingSlotsController } from './booking-slots.controller';
import { BookingService } from './booking.service';
import { Booking } from './entities/booking.entity';
import { BookingSlot } from './entities/booking-slot.entity';
import { Meeting } from '../meeting/entities/meeting.entity';
import { User } from '../../users/user.entity';
import { TeacherProfile } from '../teachers/entities/teacher-profile.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Booking, BookingSlot, Meeting, User, TeacherProfile]),
  ],
  controllers: [BookingController, BookingSlotsController],
  providers: [BookingService],
  exports: [BookingService],
})
export class BookingModule {}


