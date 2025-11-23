import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BookingController } from './booking.controller';
import { BookingService } from './booking.service';
import { Booking } from './entities/booking.entity';
import { BookingSlot } from './entities/booking-slot.entity';
import { Meeting } from '../meeting/entities/meeting.entity';
import { User } from '../../users/user.entity';
import { CreditsModule } from '../credits/credits.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Booking, BookingSlot, Meeting, User]),
    CreditsModule,
  ],
  controllers: [BookingController],
  providers: [BookingService],
  exports: [BookingService],
})
export class BookingModule {}


