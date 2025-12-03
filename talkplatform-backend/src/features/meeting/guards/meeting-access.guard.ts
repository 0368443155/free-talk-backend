import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Booking, BookingStatus } from '../../booking/entities/booking.entity';
import { Meeting, MeetingStatus } from '../entities/meeting.entity';

/**
 * Meeting Access Guard
 * 
 * Kiểm tra quyền truy cập vào phòng học:
 * 1. Valid Booking: User phải có booking CONFIRMED cho meeting đó
 * 2. Time Window: Chỉ được join trong khoảng start_time - 10 phút đến end_time
 * 3. Role Check: Teacher của lớp được join bất cứ lúc nào (trong khung giờ)
 * 4. Payment Check: Booking phải có trạng thái thanh toán thành công
 */
@Injectable()
export class MeetingAccessGuard implements CanActivate {
  private readonly logger = new Logger(MeetingAccessGuard.name);

  constructor(
    @InjectRepository(Booking)
    private readonly bookingRepository: Repository<Booking>,
    @InjectRepository(Meeting)
    private readonly meetingRepository: Repository<Meeting>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const meetingId = request.params.id || request.params.meetingId;

    if (!user || !meetingId) {
      throw new BadRequestException('Missing user or meeting ID');
    }

    // 1. Get Meeting Info
    const meeting = await this.meetingRepository.findOne({
      where: { id: meetingId },
      relations: ['host'],
    });

    if (!meeting) {
      throw new BadRequestException('Meeting not found');
    }

    // 2. Check Meeting Status
    if (meeting.status === MeetingStatus.ENDED || meeting.status === MeetingStatus.CANCELLED) {
      throw new ForbiddenException('Class is closed or cancelled.');
    }

    // 3. Check Role & Booking
    // Nếu là Teacher/Host của lớp -> Allow (trong khung giờ)
    if (meeting.host?.id === user.id || meeting.host?.id === user.userId) {
      // Teacher có thể join sớm 10 phút trước start_time
      if (meeting.scheduled_at) {
        const now = new Date();
        const allowedStart = new Date(meeting.scheduled_at.getTime() - 10 * 60000); // 10 phút trước

        if (now < allowedStart) {
          throw new ForbiddenException(
            'Class has not started yet. You can join 10 minutes before the scheduled time.',
          );
        }
      }
      return true;
    }

    // 4. Nếu là Student -> Check Booking
    const booking = await this.bookingRepository.findOne({
      where: {
        meeting_id: meetingId,
        student_id: user.id || user.userId,
        status: BookingStatus.CONFIRMED,
      },
    });

    if (!booking) {
      throw new ForbiddenException('You do not have a valid booking for this class.');
    }

    // 5. Check Time Window (Cho phép vào sớm 10 phút)
    if (meeting.scheduled_at) {
      const now = new Date();
      const allowedStart = new Date(meeting.scheduled_at.getTime() - 10 * 60000); // 10 phút trước
      const endTime = new Date(meeting.scheduled_at.getTime() + 60 * 60 * 1000); // Giả sử 60 phút

      if (now < allowedStart) {
        throw new ForbiddenException(
          'Class has not started yet. You can join 10 minutes before the scheduled time.',
        );
      }

      if (now > endTime) {
        throw new ForbiddenException('Class has ended.');
      }
    }

    // 6. Check Payment (credits_paid > 0)
    if (booking.credits_paid <= 0) {
      throw new ForbiddenException('Payment not completed for this booking.');
    }

    this.logger.log(`Access granted for user ${user.id} to meeting ${meetingId}`);
    return true;
  }
}

