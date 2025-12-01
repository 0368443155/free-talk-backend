import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Booking, BookingStatus } from '../../entities/booking.entity';
import { BookingSlot } from '../../entities/booking-slot.entity';
import { BookingAggregate } from '../../domain/booking.aggregate';

export interface BookingFilters {
  studentId?: string;
  teacherId?: string;
  status?: BookingStatus;
  fromDate?: Date;
  toDate?: Date;
}

export interface PaginationOptions {
  page: number;
  limit: number;
}

export interface FindWithFiltersResult {
  bookings: BookingAggregate[];
  total: number;
}

@Injectable()
export class BookingRepository {
  constructor(
    @InjectRepository(Booking)
    private readonly bookingRepository: Repository<Booking>,
    @InjectRepository(BookingSlot)
    private readonly slotRepository: Repository<BookingSlot>,
  ) {}

  /**
   * Find booking by ID
   */
  async findById(bookingId: string, includeSlot = false): Promise<BookingAggregate | null> {
    const booking = await this.bookingRepository.findOne({
      where: { id: bookingId },
      relations: ['student', 'teacher', 'meeting'],
    });

    if (!booking) {
      return null;
    }

    let slot: BookingSlot | null = null;
    if (includeSlot) {
      slot = await this.slotRepository.findOne({
        where: { booking: { id: bookingId } },
      });
    }

    return new BookingAggregate(booking, slot || undefined);
  }

  /**
   * Find bookings with filters and pagination
   */
  async findWithFilters(
    filters: BookingFilters,
    pagination: PaginationOptions,
  ): Promise<FindWithFiltersResult> {
    const queryBuilder = this.bookingRepository.createQueryBuilder('booking');

    // Apply filters
    if (filters.studentId) {
      queryBuilder.andWhere('booking.student_id = :studentId', { studentId: filters.studentId });
    }

    if (filters.teacherId) {
      queryBuilder.andWhere('booking.teacher_id = :teacherId', { teacherId: filters.teacherId });
    }

    if (filters.status) {
      queryBuilder.andWhere('booking.status = :status', { status: filters.status });
    }

    if (filters.fromDate) {
      queryBuilder.andWhere('booking.scheduled_at >= :fromDate', { fromDate: filters.fromDate });
    }

    if (filters.toDate) {
      queryBuilder.andWhere('booking.scheduled_at <= :toDate', { toDate: filters.toDate });
    }

    // Get total count
    const total = await queryBuilder.getCount();

    // Apply pagination
    const skip = (pagination.page - 1) * pagination.limit;
    queryBuilder.skip(skip).take(pagination.limit);

    // Order by scheduled date
    queryBuilder.orderBy('booking.scheduled_at', 'ASC');

    // Load relations
    queryBuilder.leftJoinAndSelect('booking.student', 'student');
    queryBuilder.leftJoinAndSelect('booking.teacher', 'teacher');
    queryBuilder.leftJoinAndSelect('booking.meeting', 'meeting');

    // Execute query
    const bookings = await queryBuilder.getMany();

    // Convert to aggregates
    const aggregates = bookings.map(booking => new BookingAggregate(booking));

    return {
      bookings: aggregates,
      total,
    };
  }

  /**
   * Save booking aggregate
   */
  async save(bookingAggregate: BookingAggregate): Promise<BookingAggregate> {
    const booking = await this.bookingRepository.save(bookingAggregate.entity);
    return new BookingAggregate(booking, bookingAggregate.slotEntity || undefined);
  }

  /**
   * Delete booking
   */
  async delete(bookingId: string): Promise<void> {
    await this.bookingRepository.delete(bookingId);
  }
}

