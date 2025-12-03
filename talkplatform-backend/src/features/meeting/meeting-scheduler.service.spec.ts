import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MeetingSchedulerService } from './meeting-scheduler.service';
import { Lesson, LessonStatus } from '../courses/entities/lesson.entity';
import { Meeting, MeetingStatus } from './entities/meeting.entity';
import { Booking, BookingStatus } from '../booking/entities/booking.entity';

describe('MeetingSchedulerService', () => {
  let service: MeetingSchedulerService;
  let lessonRepository: Repository<Lesson>;
  let meetingRepository: Repository<Meeting>;
  let bookingRepository: Repository<Booking>;

  const mockLessonRepository = {
    createQueryBuilder: jest.fn(),
    update: jest.fn(),
  };

  const mockMeetingRepository = {
    update: jest.fn(),
  };

  const mockBookingRepository = {
    find: jest.fn(),
    update: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MeetingSchedulerService,
        {
          provide: getRepositoryToken(Lesson),
          useValue: mockLessonRepository,
        },
        {
          provide: getRepositoryToken(Meeting),
          useValue: mockMeetingRepository,
        },
        {
          provide: getRepositoryToken(Booking),
          useValue: mockBookingRepository,
        },
      ],
    }).compile();

    service = module.get<MeetingSchedulerService>(MeetingSchedulerService);
    lessonRepository = module.get<Repository<Lesson>>(getRepositoryToken(Lesson));
    meetingRepository = module.get<Repository<Meeting>>(getRepositoryToken(Meeting));
    bookingRepository = module.get<Repository<Booking>>(getRepositoryToken(Booking));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('autoOpenMeetings', () => {
    it('should open meetings that are scheduled to start now', async () => {
      const now = new Date();
      const meetingId = 'meeting-1';

      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };

      mockLessonRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const mockBooking: Partial<Booking> = {
        id: 'booking-1',
        status: BookingStatus.CONFIRMED,
        scheduled_at: new Date(now.getTime() - 5 * 60 * 1000), // 5 minutes ago
        meeting: {
          id: meetingId,
          status: MeetingStatus.SCHEDULED,
        } as Meeting,
      };

      mockBookingRepository.find.mockResolvedValue([mockBooking]);

      await service.autoOpenMeetings();

      expect(mockMeetingRepository.update).toHaveBeenCalledWith(
        meetingId,
        expect.objectContaining({
          status: MeetingStatus.LIVE,
          opened_at: expect.any(Date),
          auto_opened: true,
        }),
      );
    });
  });

  describe('autoCloseMeetings', () => {
    it('should close meetings that have ended', async () => {
      const now = new Date();
      const meetingId = 'meeting-1';
      const bookingId = 'booking-1';

      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };

      mockLessonRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const mockBooking: Partial<Booking> = {
        id: bookingId,
        status: BookingStatus.CONFIRMED,
        scheduled_at: new Date(now.getTime() - 70 * 60 * 1000), // 70 minutes ago
        meeting: {
          id: meetingId,
          status: MeetingStatus.LIVE,
        } as Meeting,
      };

      mockBookingRepository.find.mockResolvedValue([mockBooking]);

      await service.autoCloseMeetings();

      expect(mockMeetingRepository.update).toHaveBeenCalledWith(
        meetingId,
        expect.objectContaining({
          status: MeetingStatus.ENDED,
          closed_at: expect.any(Date),
          auto_closed: true,
        }),
      );

      expect(mockBookingRepository.update).toHaveBeenCalledWith(
        bookingId,
        expect.objectContaining({
          status: BookingStatus.COMPLETED,
        }),
      );
    });
  });
});

