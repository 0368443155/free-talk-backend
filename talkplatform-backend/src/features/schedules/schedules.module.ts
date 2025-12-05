import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Booking } from '../booking/entities/booking.entity';
import { Meeting } from '../meeting/entities/meeting.entity';
import { ReminderService } from './reminder.service';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Booking, Meeting]),
    NotificationsModule,
  ],
  providers: [ReminderService],
  exports: [ReminderService],
})
export class SchedulesModule { }

