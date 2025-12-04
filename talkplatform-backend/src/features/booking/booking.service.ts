import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Booking, BookingStatus } from './entities/booking.entity';
import { BookingSlot } from './entities/booking-slot.entity';
import { User } from '../../users/user.entity';
import { Meeting } from '../meeting/entities/meeting.entity';
import { CreateBookingDto, CancelBookingDto } from './dto/create-booking.dto';
import { RefundService } from './refund.service';

/**
 * Booking Service
 * 
 * Xử lý logic đặt lịch với Pessimistic Locking
 * Tránh double booking bằng SELECT...FOR UPDATE
 */
@Injectable()
export class BookingService {
  private readonly logger = new Logger(BookingService.name);

  constructor(
    @InjectRepository(Booking)
    private readonly bookingRepository: Repository<Booking>,
    @InjectRepository(BookingSlot)
    private readonly slotRepository: Repository<BookingSlot>,
    @InjectRepository(Meeting)
    private readonly meetingRepository: Repository<Meeting>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly refundService: RefundService,
  ) { }

  /**
   * Đặt lịch với Pessimistic Locking
   * 
   * Sử dụng Transaction với SELECT...FOR UPDATE
   * để đảm bảo chỉ một booking được tạo cho một slot
   */
  async createBooking(dto: CreateBookingDto, student: User): Promise<Booking> {
    return await this.dataSource.transaction(async (manager) => {
      // 1. Lock slot với pessimistic_write
      const slot = await manager.findOne(BookingSlot, {
        where: { id: dto.slot_id },
        lock: { mode: 'pessimistic_write' }, // 🔒 Khóa hàng để ngăn race condition
      });

      if (!slot) {
        throw new NotFoundException('Booking slot not found');
      }

      // 2. Kiểm tra slot đã được đặt chưa
      if (slot.is_booked) {
        throw new ConflictException('This slot has already been booked');
      }

      // 3. Kiểm tra slot có thuộc về giáo viên hợp lệ không
      const teacher = await manager.findOne(User, {
        where: { id: slot.teacher_id },
      });

      if (!teacher) {
        throw new NotFoundException('Teacher not found');
      }

      // 4. Kiểm tra số dư credits của học viên
      if (student.credit_balance < slot.price_credits) {
        throw new BadRequestException('Insufficient credits');
      }

      // 5. Tạo Meeting cho booking
      const meeting = new Meeting();
      meeting.title = `Class with ${teacher.name || teacher.username}`;
      meeting.description = dto.student_notes || '';
      meeting.host = teacher; // Set relation instead of host_id
      meeting.meeting_type = 'teacher_class' as any;
      meeting.max_participants = 10;
      meeting.scheduled_at = new Date(`${slot.date.toISOString().split('T')[0]}T${slot.start_time}`);
      meeting.status = 'scheduled' as any;

      const savedMeeting = await manager.save(Meeting, meeting);

      // 6. Tạo Booking
      const booking = manager.create(Booking, {
        meeting: savedMeeting,
        student: student,
        teacher: teacher,
        status: BookingStatus.CONFIRMED,
        credits_paid: slot.price_credits,
        scheduled_at: new Date(`${slot.date.toISOString().split('T')[0]}T${slot.start_time}`),
        student_notes: dto.student_notes,
      });

      const savedBooking = await manager.save(Booking, booking);

      // 7. Cập nhật slot
      slot.is_booked = true;
      slot.booking = savedBooking;
      slot.student_id = student.id;
      await manager.save(BookingSlot, slot);

      // 8. Trừ credits - tạo transaction trực tiếp
      const studentUser = await manager.findOne(User, { where: { id: student.id } });
      if (studentUser) {
        studentUser.credit_balance = (studentUser.credit_balance || 0) - slot.price_credits;
        await manager.save(User, studentUser);
      }

      this.logger.log(
        `✅ Booking created: ${savedBooking.id} for student ${student.id}, slot ${slot.id}`,
      );

      return savedBooking;
    });
  }

  /**
   * Hủy booking và hoàn tiền
   * Sử dụng RefundService để xử lý logic hoàn tiền và ledger
   */
  async cancelBooking(
    bookingId: string,
    userId: string,
    dto: CancelBookingDto,
  ): Promise<Booking> {
    const booking = await this.bookingRepository.findOne({
      where: { id: bookingId },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    // Kiểm tra quyền (chỉ student hoặc teacher mới hủy được)
    if (booking.student_id !== userId && booking.teacher_id !== userId) {
      throw new BadRequestException('You do not have permission to cancel this booking');
    }

    // Delegate to RefundService
    await this.refundService.refundBooking(
      bookingId,
      userId,
      dto.cancellation_reason || 'User cancelled'
    );

    // Return updated booking
    const updatedBooking = await this.bookingRepository.findOne({ where: { id: bookingId } });
    if (!updatedBooking) {
      throw new NotFoundException('Booking not found after cancellation');
    }
    return updatedBooking;
  }

  /**
   * Tính toán số tiền hoàn lại dựa trên cancellation policy
   * 
   * Policy:
   * - Teacher hủy: 100% refund (full refund)
   * - Student hủy >24h trước: 100% refund
   * - Student hủy <24h trước: 50% refund
   * 
   * Tất cả tính toán dựa trên UTC để đảm bảo chính xác
   */
  private calculateRefund(booking: Booking, isTeacherCancelling: boolean): number {
    // Teacher hủy = full refund
    if (isTeacherCancelling) {
      this.logger.log(`Teacher cancelled booking ${booking.id}, full refund`);
      return booking.credits_paid;
    }

    // Student hủy = theo policy
    const now = new Date(); // Server time (UTC)
    const scheduledAt = new Date(booking.scheduled_at); // DB stores UTC

    // Tính khoảng cách giờ chính xác (có thể âm nếu đã qua giờ)
    const hoursUntilClass = (scheduledAt.getTime() - now.getTime()) / (1000 * 60 * 60);

    // Policy: > 24h = 100%, < 24h = 50%
    // Edge case: Nếu đã qua giờ (hoursUntilClass < 0), vẫn tính là < 24h
    if (hoursUntilClass >= 24) {
      this.logger.log(
        `Student cancelled ${hoursUntilClass.toFixed(1)}h before class, 100% refund`,
      );
      return booking.credits_paid; // 100% refund
    } else {
      this.logger.log(
        `Student cancelled ${hoursUntilClass.toFixed(1)}h before class, 50% refund`,
      );
      return Math.floor(booking.credits_paid * 0.5); // 50% refund
    }
  }

  /**
   * Lấy danh sách bookings của user
   */
  async getMyBookings(userId: string, role: 'student' | 'teacher') {
    try {
      const where: any = role === 'student' ? { student_id: userId } : { teacher_id: userId };

      this.logger.log(`Getting bookings for user ${userId} with role ${role}`);

      const bookings = await this.bookingRepository.find({
        where,
        relations: ['meeting', 'student', 'teacher'],
        order: { scheduled_at: 'DESC' },
      });

      this.logger.log(`Found ${bookings.length} bookings`);
      return bookings;
    } catch (error) {
      this.logger.error(`Error getting bookings: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Lấy booking theo ID
   */
  async findOne(bookingId: string, userId: string): Promise<Booking> {
    const booking = await this.bookingRepository.findOne({
      where: { id: bookingId },
      relations: ['meeting', 'student', 'teacher'],
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    // Kiểm tra quyền
    if (booking.student_id !== userId && booking.teacher_id !== userId) {
      throw new BadRequestException('You do not have permission to view this booking');
    }

    return booking;
  }
}

