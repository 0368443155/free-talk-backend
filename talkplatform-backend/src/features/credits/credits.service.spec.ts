import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BadRequestException } from '@nestjs/common';
import { CreditsService } from './credits.service';
import { CreditTransaction, TransactionType, TransactionStatus, PaymentProvider } from './entities/credit-transaction.entity';
import { CreditPackage } from './entities/credit-package.entity';
import { User } from '../../users/user.entity';
import { Meeting } from '../meeting/entities/meeting.entity';

describe('CreditsService - Revenue Sharing', () => {
  let service: CreditsService;
  let transactionRepository: Repository<CreditTransaction>;
  let userRepository: Repository<User>;
  let meetingRepository: Repository<Meeting>;
  let packageRepository: Repository<CreditPackage>;

  const mockTransactionRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
  };

  const mockUserRepository = {
    findOne: jest.fn(),
    save: jest.fn(),
    create: jest.fn(),
  };

  const mockMeetingRepository = {
    findOne: jest.fn(),
    save: jest.fn(),
  };

  const mockPackageRepository = {
    findOne: jest.fn(),
    find: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreditsService,
        {
          provide: getRepositoryToken(CreditTransaction),
          useValue: mockTransactionRepository,
        },
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
        {
          provide: getRepositoryToken(Meeting),
          useValue: mockMeetingRepository,
        },
        {
          provide: getRepositoryToken(CreditPackage),
          useValue: mockPackageRepository,
        },
      ],
    }).compile();

    service = module.get<CreditsService>(CreditsService);
    transactionRepository = module.get<Repository<CreditTransaction>>(
      getRepositoryToken(CreditTransaction),
    );
    userRepository = module.get<Repository<User>>(getRepositoryToken(User));
    meetingRepository = module.get<Repository<Meeting>>(getRepositoryToken(Meeting));
    packageRepository = module.get<Repository<CreditPackage>>(
      getRepositoryToken(CreditPackage),
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Revenue Sharing Policy', () => {
    describe('Organic Student (Platform Source)', () => {
      it('should split revenue 30% platform, 70% teacher for organic student', async () => {
        // Arrange
        const meeting: Partial<Meeting> = {
          id: 'meeting-1',
          title: 'Test Meeting',
          price_credits: 100,
          host: {
            id: 'teacher-1',
            credit_balance: 0,
          } as User,
        };

        const student: Partial<User> = {
          id: 'student-1',
          credit_balance: 200,
          referrer_id: null, // No referrer = organic
          affiliate_code: null,
        };

        // Mock isAffiliateStudent to return false
        jest.spyOn(service as any, 'isAffiliateStudent').mockResolvedValue(false);

        // Mock transaction repository
        mockTransactionRepository.create.mockReturnValue({});
        mockTransactionRepository.save.mockResolvedValue({});
        mockUserRepository.save.mockResolvedValue({});

        // Act
        const result = await service.processClassPayment(meeting as Meeting, student as User);

        // Assert
        expect(result.platform_fee).toBe(30); // 30% of 100
        expect(result.teacher_earning).toBe(70); // 70% of 100
        expect(result.revenue_share).toContain('30% platform');
        expect(result.revenue_share).toContain('70% teacher');
      });

      it('should handle 99 credits correctly (rounding)', async () => {
        const meeting: Partial<Meeting> = {
          id: 'meeting-1',
          title: 'Test Meeting',
          price_credits: 99,
          host: {
            id: 'teacher-1',
            credit_balance: 0,
          } as User,
        };

        const student: Partial<User> = {
          id: 'student-1',
          credit_balance: 200,
          referrer_id: null,
        };

        jest.spyOn(service as any, 'isAffiliateStudent').mockResolvedValue(false);
        mockTransactionRepository.create.mockReturnValue({});
        mockTransactionRepository.save.mockResolvedValue({});
        mockUserRepository.save.mockResolvedValue({});

        const result = await service.processClassPayment(meeting as Meeting, student as User);

        // 30% of 99 = 29.7, should round properly
        expect(result.platform_fee).toBeCloseTo(29.7, 1);
        expect(result.teacher_earning).toBeCloseTo(69.3, 1);
        expect(result.amount_paid).toBe(99);
      });
    });

    describe('Affiliate Student (Teacher Referral)', () => {
      it('should split revenue 10% platform, 90% teacher for affiliate student', async () => {
        // Arrange
        const meeting: Partial<Meeting> = {
          id: 'meeting-1',
          title: 'Test Meeting',
          price_credits: 100,
          host: {
            id: 'teacher-1',
            credit_balance: 0,
          } as User,
        };

        const student: Partial<User> = {
          id: 'student-1',
          credit_balance: 200,
          referrer_id: 'teacher-1', // Referred by this teacher
          affiliate_code: null,
        };

        // Mock isAffiliateStudent to return true
        jest.spyOn(service as any, 'isAffiliateStudent').mockResolvedValue(true);

        mockTransactionRepository.create.mockReturnValue({});
        mockTransactionRepository.save.mockResolvedValue({});
        mockUserRepository.save.mockResolvedValue({});

        // Act
        const result = await service.processClassPayment(meeting as Meeting, student as User);

        // Assert
        expect(result.platform_fee).toBe(10); // 10% of 100
        expect(result.teacher_earning).toBe(90); // 90% of 100
        expect(result.revenue_share).toContain('10% platform');
        expect(result.revenue_share).toContain('90% teacher');
      });

      it('should handle high value class (1000 credits) correctly', async () => {
        const meeting: Partial<Meeting> = {
          id: 'meeting-1',
          title: 'Test Meeting',
          price_credits: 1000,
          host: {
            id: 'teacher-1',
            credit_balance: 0,
          } as User,
        };

        const student: Partial<User> = {
          id: 'student-1',
          credit_balance: 2000,
          referrer_id: 'teacher-1',
        };

        jest.spyOn(service as any, 'isAffiliateStudent').mockResolvedValue(true);
        mockTransactionRepository.create.mockReturnValue({});
        mockTransactionRepository.save.mockResolvedValue({});
        mockUserRepository.save.mockResolvedValue({});

        const result = await service.processClassPayment(meeting as Meeting, student as User);

        expect(result.platform_fee).toBe(100); // 10% of 1000
        expect(result.teacher_earning).toBe(900); // 90% of 1000
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle free class (0 credits)', async () => {
      const meeting: Partial<Meeting> = {
        id: 'meeting-1',
        title: 'Free Meeting',
        price_credits: 0,
        host: {
          id: 'teacher-1',
        } as User,
      };

      const student: Partial<User> = {
        id: 'student-1',
        credit_balance: 100,
      };

      const result = await service.processClassPayment(meeting as Meeting, student as User);

      expect(result.success).toBe(true);
      expect(result.amount_paid).toBe(0);
      expect(result.platform_fee).toBe(0);
      expect(result.teacher_earning).toBe(0);
    });

    it('should throw error if student has insufficient balance', async () => {
      const meeting: Partial<Meeting> = {
        id: 'meeting-1',
        title: 'Test Meeting',
        price_credits: 100,
        host: {
          id: 'teacher-1',
        } as User,
      };

      const student: Partial<User> = {
        id: 'student-1',
        credit_balance: 50, // Insufficient
        referrer_id: null,
      };

      await expect(
        service.processClassPayment(meeting as Meeting, student as User),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('isAffiliateStudent Logic', () => {
    it('should return true if student.referrer_id matches teacher.id', async () => {
      const student: Partial<User> = {
        id: 'student-1',
        referrer_id: 'teacher-1',
      };

      const teacher: Partial<User> = {
        id: 'teacher-1',
      };

      const result = await (service as any).isAffiliateStudent(student as User, teacher as User);

      expect(result).toBe(true);
    });

    it('should return false if student.referrer_id does not match', async () => {
      const student: Partial<User> = {
        id: 'student-1',
        referrer_id: 'teacher-2',
      };

      const teacher: Partial<User> = {
        id: 'teacher-1',
      };

      const result = await (service as any).isAffiliateStudent(student as User, teacher as User);

      expect(result).toBe(false);
    });

    it('should return false if student has no referrer', async () => {
      const student: Partial<User> = {
        id: 'student-1',
        referrer_id: null,
      };

      const teacher: Partial<User> = {
        id: 'teacher-1',
      };

      const result = await (service as any).isAffiliateStudent(student as User, teacher as User);

      expect(result).toBe(false);
    });

    it('should return false if student refers to different teacher', async () => {
      const student: Partial<User> = {
        id: 'student-1',
        referrer_id: 'teacher-2', // Referred by different teacher
        affiliate_code: null,
      };

      const teacher: Partial<User> = {
        id: 'teacher-1', // Current meeting teacher
      };

      const result = await (service as any).isAffiliateStudent(student as User, teacher as User);

      expect(result).toBe(false);
    });
  });

  describe('Credit Balance Updates', () => {
    it('should deduct from student balance', async () => {
      const meeting: Partial<Meeting> = {
        id: 'meeting-1',
        title: 'Test Meeting',
        price_credits: 100,
        host: {
          id: 'teacher-1',
          credit_balance: 0,
        } as User,
      };

      const student: Partial<User> = {
        id: 'student-1',
        credit_balance: 200,
        referrer_id: null,
      };

      jest.spyOn(service as any, 'isAffiliateStudent').mockResolvedValue(false);
      mockTransactionRepository.create.mockReturnValue({});
      mockTransactionRepository.save.mockResolvedValue({});
      mockUserRepository.save.mockImplementation((user) => Promise.resolve(user));

      await service.processClassPayment(meeting as Meeting, student as User);

      // Student balance should decrease
      expect(student.credit_balance).toBe(100); // 200 - 100
    });

    it('should add to teacher balance for organic student', async () => {
      const meeting: Partial<Meeting> = {
        id: 'meeting-1',
        title: 'Test Meeting',
        price_credits: 100,
        host: {
          id: 'teacher-1',
          credit_balance: 50,
        } as User,
      };

      const student: Partial<User> = {
        id: 'student-1',
        credit_balance: 200,
        referrer_id: null,
      };

      jest.spyOn(service as any, 'isAffiliateStudent').mockResolvedValue(false);
      mockTransactionRepository.create.mockReturnValue({});
      mockTransactionRepository.save.mockResolvedValue({});
      mockUserRepository.save.mockImplementation((user) => Promise.resolve(user));

      await service.processClassPayment(meeting as Meeting, student as User);

      // Teacher should get 70% = 70 credits
      expect(meeting.host.credit_balance).toBe(120); // 50 + 70
    });

    it('should add to teacher balance for affiliate student (90%)', async () => {
      const meeting: Partial<Meeting> = {
        id: 'meeting-1',
        title: 'Test Meeting',
        price_credits: 100,
        host: {
          id: 'teacher-1',
          credit_balance: 50,
        } as User,
      };

      const student: Partial<User> = {
        id: 'student-1',
        credit_balance: 200,
        referrer_id: 'teacher-1',
      };

      jest.spyOn(service as any, 'isAffiliateStudent').mockResolvedValue(true);
      mockTransactionRepository.create.mockReturnValue({});
      mockTransactionRepository.save.mockResolvedValue({});
      mockUserRepository.save.mockImplementation((user) => Promise.resolve(user));

      await service.processClassPayment(meeting as Meeting, student as User);

      // Teacher should get 90% = 90 credits
      expect(meeting.host.credit_balance).toBe(140); // 50 + 90
    });
  });
});

