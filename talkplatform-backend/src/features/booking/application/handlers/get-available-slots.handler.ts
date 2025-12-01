import { Injectable, Logger } from '@nestjs/common';
import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';
import { GetAvailableSlotsQuery } from '../queries/get-available-slots.query';
import { BookingSlotRepository } from '../../infrastructure/repositories/booking-slot.repository';
import { BookingSlot } from '../../entities/booking-slot.entity';

@Injectable()
@QueryHandler(GetAvailableSlotsQuery)
export class GetAvailableSlotsHandler implements IQueryHandler<GetAvailableSlotsQuery> {
  private readonly logger = new Logger(GetAvailableSlotsHandler.name);

  constructor(private readonly slotRepository: BookingSlotRepository) {}

  async execute(query: GetAvailableSlotsQuery): Promise<BookingSlot[]> {
    this.logger.log(`Getting available slots for teacher ${query.teacherId}`);

    const slots = await this.slotRepository.findAvailable(
      query.teacherId,
      query.fromDate,
      query.toDate,
    );

    return slots.map(slot => slot.entity);
  }
}

