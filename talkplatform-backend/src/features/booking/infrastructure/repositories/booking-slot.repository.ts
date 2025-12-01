import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThanOrEqual } from 'typeorm';
import { BookingSlot } from '../../entities/booking-slot.entity';
import { BookingSlotAggregate } from '../../domain/booking-slot.aggregate';

@Injectable()
export class BookingSlotRepository {
  constructor(
    @InjectRepository(BookingSlot)
    private readonly slotRepository: Repository<BookingSlot>,
  ) {}

  /**
   * Find available slots for a teacher
   */
  async findAvailable(
    teacherId: string,
    fromDate?: Date,
    toDate?: Date,
  ): Promise<BookingSlotAggregate[]> {
    const queryBuilder = this.slotRepository.createQueryBuilder('slot');

    queryBuilder.where('slot.teacher_id = :teacherId', { teacherId });
    queryBuilder.andWhere('slot.is_booked = :isBooked', { isBooked: false });

    // Filter by date range
    const now = new Date();
    const startDate = fromDate || now;
    queryBuilder.andWhere('slot.date >= :startDate', { startDate: startDate.toISOString().split('T')[0] });

    if (toDate) {
      queryBuilder.andWhere('slot.date <= :toDate', { toDate: toDate.toISOString().split('T')[0] });
    }

    // Order by date and time
    queryBuilder.orderBy('slot.date', 'ASC');
    queryBuilder.addOrderBy('slot.start_time', 'ASC');

    const slots = await queryBuilder.getMany();

    return slots.map(slot => new BookingSlotAggregate(slot));
  }

  /**
   * Find slot by ID
   */
  async findById(slotId: string): Promise<BookingSlotAggregate | null> {
    const slot = await this.slotRepository.findOne({
      where: { id: slotId },
      relations: ['teacher', 'booking'],
    });

    if (!slot) {
      return null;
    }

    return new BookingSlotAggregate(slot);
  }

  /**
   * Save slot aggregate
   */
  async save(slotAggregate: BookingSlotAggregate): Promise<BookingSlotAggregate> {
    const slot = await this.slotRepository.save(slotAggregate.entity);
    return new BookingSlotAggregate(slot);
  }

  /**
   * Delete slot
   */
  async delete(slotId: string): Promise<void> {
    await this.slotRepository.delete(slotId);
  }
}

