import { Injectable, Logger } from '@nestjs/common';
import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';
import { GetBookingsQuery } from '../queries/get-bookings.query';
import { BookingRepository } from '../../infrastructure/repositories/booking.repository';
import { Booking } from '../../entities/booking.entity';

export interface GetBookingsResult {
  bookings: Booking[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@Injectable()
@QueryHandler(GetBookingsQuery)
export class GetBookingsHandler implements IQueryHandler<GetBookingsQuery> {
  private readonly logger = new Logger(GetBookingsHandler.name);

  constructor(private readonly bookingRepository: BookingRepository) {}

  async execute(query: GetBookingsQuery): Promise<GetBookingsResult> {
    const page = query.pagination?.page || 1;
    const limit = query.pagination?.limit || 10;

    this.logger.log(`Getting bookings with filters: ${JSON.stringify(query.filters)}`);

    const result = await this.bookingRepository.findWithFilters(
      query.filters || {},
      { page, limit },
    );

    return {
      bookings: result.bookings.map(agg => agg.entity),
      total: result.total,
      page,
      limit,
      totalPages: Math.ceil(result.total / limit),
    };
  }
}

