import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BookingController } from './booking.controller';
import { BookingSlotsController } from './booking-slots.controller';
import { BookingService } from './booking.service';
import { RefundService } from './refund.service';
import { BookingGateway } from './booking.gateway';
import { Booking } from './entities/booking.entity';
import { BookingSlot } from './entities/booking-slot.entity';
import { Meeting } from '../meeting/entities/meeting.entity';
import { User } from '../../users/user.entity';
import { TeacherProfile } from '../teachers/entities/teacher-profile.entity';
import { WalletModule } from '../wallet/wallet.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { RoomModule } from '../../core/room/room.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Booking, BookingSlot, Meeting, User, TeacherProfile]),
    WalletModule,
    NotificationsModule,
    RoomModule, // Import RoomModule to get UserSocketManagerService
  ],
  controllers: [BookingController, BookingSlotsController],
  providers: [BookingService, RefundService, BookingGateway],
  exports: [BookingService, RefundService],
})
export class BookingModule { }


