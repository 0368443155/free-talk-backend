import {
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { CancelBookingCommand } from '../commands/cancel-booking.command';
import { BookingRepository } from '../../infrastructure/repositories/booking.repository';
import { BookingAggregate } from '../../domain/booking.aggregate';
import { Booking } from '../../entities/booking.entity';
import { User } from '../../../../users/user.entity';
import { EventBusService } from '../../../../infrastructure/event-bus/services/event-bus.service';
import { RefundIssuedEvent } from '../../../../infrastructure/event-bus/events/payment-events/refund-issued.event';

@Injectable()
@CommandHandler(CancelBookingCommand)
export class CancelBookingHandler implements ICommandHandler<CancelBookingCommand> {
  private readonly logger = new Logger(CancelBookingHandler.name);

  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly bookingRepository: BookingRepository,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly eventBus: EventBusService,
  ) {}

  async execute(command: CancelBookingCommand): Promise<Booking> {
    this.logger.log(`Cancelling booking ${command.bookingId} by user ${command.userId}`);

    return await this.dataSource.transaction(async (manager) => {
      // 1. Load booking with slot
      const bookingAggregate = await this.bookingRepository.findById(command.bookingId, true);

      if (!bookingAggregate) {
        throw new NotFoundException('Booking not found');
      }

      // 2. Calculate refund
      const refundAmount = bookingAggregate.calculateRefund('partial');

      // 3. Cancel booking
      bookingAggregate.cancel(command.userId, command.cancellationReason, refundAmount);

      // 4. Save booking
      await manager.save(Booking, bookingAggregate.entity);

      // 5. Save slot if exists
      if (bookingAggregate.slotEntity) {
        await manager.save(bookingAggregate.slotEntity);
      }

      // 6. Refund credits to student
      if (refundAmount > 0) {
        const student = await manager.findOne(User, {
          where: { id: bookingAggregate.studentId },
        });

        if (student) {
          student.credit_balance = (student.credit_balance || 0) + refundAmount;
          await manager.save(User, student);

          // Publish refund event
          await this.eventBus.publish(
            new RefundIssuedEvent({
              refundId: uuidv4(),
              transactionId: bookingAggregate.id,
              userId: bookingAggregate.studentId,
              amount: refundAmount,
              reason: 'Booking cancelled',
              issuedAt: new Date(),
            }),
          );
        }
      }

      this.logger.log(`✅ Booking ${command.bookingId} cancelled, refund: ${refundAmount} credits`);

      return bookingAggregate.entity;
    });
  }
}

