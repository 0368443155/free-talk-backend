import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { CreateBookingCommand } from '../commands/create-booking.command';
import { BookingRepository } from '../../infrastructure/repositories/booking.repository';
import { BookingSlotRepository } from '../../infrastructure/repositories/booking-slot.repository';
import { BookingAggregate } from '../../domain/booking.aggregate';
import { BookingSlotAggregate } from '../../domain/booking-slot.aggregate';
import { Booking, BookingStatus } from '../../entities/booking.entity';
import { BookingSlot } from '../../entities/booking-slot.entity';
import { User } from '../../../users/user.entity';
import { Meeting, MeetingType, PricingType } from '../../../features/meeting/entities/meeting.entity';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
@CommandHandler(CreateBookingCommand)
export class CreateBookingHandler implements ICommandHandler<CreateBookingCommand> {
  private readonly logger = new Logger(CreateBookingHandler.name);

  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly bookingRepository: BookingRepository,
    private readonly slotRepository: BookingSlotRepository,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Meeting)
    private readonly meetingRepository: Repository<Meeting>,
  ) {}

  async execute(command: CreateBookingCommand): Promise<Booking> {
    this.logger.log(`Creating booking for student ${command.studentId}, slot ${command.slotId}`);

    return await this.dataSource.transaction(async (manager) => {
      // 1. Load and lock slot with pessimistic lock
      const slot = await manager.findOne(BookingSlot, {
        where: { id: command.slotId },
        lock: { mode: 'pessimistic_write' },
        relations: ['teacher'],
      });

      if (!slot) {
        throw new NotFoundException('Booking slot not found');
      }

      const slotAggregate = new BookingSlotAggregate(slot);

      // 2. Check if slot is available
      const availability = slotAggregate.isAvailable();
      if (!availability.available) {
        throw new ConflictException(availability.reason || 'Slot is not available');
      }

      // 3. Get student
      const student = await manager.findOne(User, { where: { id: command.studentId } });
      if (!student) {
        throw new NotFoundException('Student not found');
      }

      // 4. Check student has enough credits
      const requiredCredits = slot.price_credits;
      if ((student.credit_balance || 0) < requiredCredits) {
        throw new BadRequestException('Insufficient credits');
      }

      // 5. Get teacher
      const teacher = slot.teacher;
      if (!teacher) {
        throw new NotFoundException('Teacher not found');
      }

      // 6. Create meeting
      const meeting = manager.create(Meeting, {
        id: uuidv4(),
        title: `Private Session - ${teacher.username}`,
        description: command.studentNotes || 'Private session booking',
        meeting_type: MeetingType.PRIVATE_SESSION,
        host: teacher,
        max_participants: 2,
        pricing_type: PricingType.CREDITS,
        price_credits: requiredCredits,
        is_private: true,
        is_locked: false,
        status: 'scheduled' as any,
        scheduled_at: slotAggregate.getSlotDateTime(),
      });

      const savedMeeting = await manager.save(Meeting, meeting);

      // 7. Create booking
      const booking = manager.create(Booking, {
        id: uuidv4(),
        meeting: savedMeeting,
        student: student,
        teacher: teacher,
        status: BookingStatus.CONFIRMED,
        credits_paid: requiredCredits,
        scheduled_at: slotAggregate.getSlotDateTime(),
        student_notes: command.studentNotes,
      });

      const savedBooking = await manager.save(Booking, booking);

      // 8. Book the slot
      slotAggregate.book(command.studentId, savedBooking.id);
      slot.booking = savedBooking;
      await manager.save(BookingSlot, slot);

      // 9. Deduct credits
      student.credit_balance = (student.credit_balance || 0) - requiredCredits;
      await manager.save(User, student);

      this.logger.log(`✅ Booking created: ${savedBooking.id}`);

      return savedBooking;
    });
  }
}

