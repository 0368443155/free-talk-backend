import { BookingStatus } from '../../entities/booking.entity';

export class GetBookingsQuery {
  constructor(
    public readonly filters?: {
      studentId?: string;
      teacherId?: string;
      status?: BookingStatus;
      fromDate?: Date;
      toDate?: Date;
    },
    public readonly pagination?: {
      page?: number;
      limit?: number;
    },
  ) {}
}

