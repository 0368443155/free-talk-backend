import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { BookingService } from './booking.service';
import { Booking, BookingStatus } from './entities/booking.entity';
import { BookingSlot } from './entities/booking-slot.entity';
import { Meeting } from '../meeting/entities/meeting.entity';
import { User } from '../../users/user.entity';

describe('BookingService', () => {
  let service: BookingService;
  let bookingRepository: Repository<Booking>;
  let slotRepository: Repository<BookingSlot>;
  let meetingRepository: Repository<Meeting>;
  let userRepository: Repository<User>;
  let dataSource: DataSource;

  const mockDataSource = {
    transaction: jest.fn(),
  };

  const mockBookingRepository = {
    findOne: jest.fn(),
    save: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    find: jest.fn(),
  };

  const mockSlotRepository = {
    findOne: jest.fn(),
    save: jest.fn(),
  };

  const mockMeetingRepository = {
    save: jest.fn(),
  };

  const mockUserRepository = {
    findOne: jest.fn(),
    save: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BookingService,
        {
          provide: getRepositoryToken(Booking),
          useValue: mockBookingRepository,
        },
        {
          provide: getRepositoryToken(BookingSlot),
          useValue: mockSlotRepository,
        },
        {
          provide: getRepositoryToken(Meeting),
          useValue: mockMeetingRepository,
        },
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
      ],
    }).compile();

    service = module.get<BookingService>(BookingService);
    bookingRepository = module.get<Repository<Booking>>(getRepositoryToken(Booking));
    slotRepository = module.get<Repository<BookingSlot>>(getRepositoryToken(BookingSlot));
    meetingRepository = module.get<Repository<Meeting>>(getRepositoryToken(Meeting));
    userRepository = module.get<Repository<User>>(getRepositoryToken(User));
    dataSource = module.get<DataSource>(DataSource);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('cancelBooking', () => {
    it('should refund 100% if teacher cancels', async () => {
      const bookingId = 'booking-1';
      const teacherId = 'teacher-1';
      const studentId = 'student-1';
      const creditsPaid = 100;

      const mockBooking: Partial<Booking> = {
        id: bookingId,
        student_id: studentId,
        teacher_id: teacherId,
        credits_paid: creditsPaid,
        status: BookingStatus.CONFIRMED,
        scheduled_at: new Date(Date.now() + 48 * 60 * 60 * 1000), // 48h later
      };

      const mockStudent: Partial<User> = {
        id: studentId,
        credit_balance: 0,
      };

      mockDataSource.transaction = jest.fn(async (callback) => {
        const manager = {
          findOne: jest.fn(),
          save: jest.fn(),
          update: jest.fn(),
        };

        manager.findOne
          .mockResolvedValueOnce(mockBooking as Booking)
          .mockResolvedValueOnce(mockStudent as User);

        return callback(manager);
      });

      mockSlotRepository.findOne.mockResolvedValue({
        id: 'slot-1',
        is_booked: true,
        booking_id: bookingId,
      });

      const result = await service.cancelBooking(bookingId, teacherId, {
        cancellation_reason: 'Teacher unavailable',
      });

      expect(result.credits_refunded).toBe(creditsPaid); // 100% refund
      expect(result.status).toBe(BookingStatus.CANCELLED);
    });

    it('should refund 100% if student cancels >24h before class', async () => {
      const bookingId = 'booking-1';
      const studentId = 'student-1';
      const creditsPaid = 100;

      const mockBooking: Partial<Booking> = {
        id: bookingId,
        student_id: studentId,
        teacher_id: 'teacher-1',
        credits_paid: creditsPaid,
        status: BookingStatus.CONFIRMED,
        scheduled_at: new Date(Date.now() + 48 * 60 * 60 * 1000), // 48h later
      };

      mockDataSource.transaction = jest.fn(async (callback) => {
        const manager = {
          findOne: jest.fn(),
          save: jest.fn(),
        };

        manager.findOne
          .mockResolvedValueOnce(mockBooking as Booking)
          .mockResolvedValueOnce({ id: studentId, credit_balance: 0 });

        return callback(manager);
      });

      const result = await service.cancelBooking(bookingId, studentId, {
        cancellation_reason: 'Student unavailable',
      });

      expect(result.credits_refunded).toBe(creditsPaid); // 100% refund
    });

    it('should refund 50% if student cancels <24h before class', async () => {
      const bookingId = 'booking-1';
      const studentId = 'student-1';
      const creditsPaid = 100;

      const mockBooking: Partial<Booking> = {
        id: bookingId,
        student_id: studentId,
        teacher_id: 'teacher-1',
        credits_paid: creditsPaid,
        status: BookingStatus.CONFIRMED,
        scheduled_at: new Date(Date.now() + 12 * 60 * 60 * 1000), // 12h later
      };

      mockDataSource.transaction = jest.fn(async (callback) => {
        const manager = {
          findOne: jest.fn(),
          save: jest.fn(),
        };

        manager.findOne
          .mockResolvedValueOnce(mockBooking as Booking)
          .mockResolvedValueOnce({ id: studentId, credit_balance: 0 });

        return callback(manager);
      });

      const result = await service.cancelBooking(bookingId, studentId, {
        cancellation_reason: 'Student unavailable',
      });

      expect(result.credits_refunded).toBe(50); // 50% refund
    });
  });
});

