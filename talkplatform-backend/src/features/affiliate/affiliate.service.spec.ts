import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AffiliateService } from './affiliate.service';
import { User } from '../../users/user.entity';
import { CreditTransaction, TransactionType, TransactionStatus } from '../credits/entities/credit-transaction.entity';

describe('AffiliateService', () => {
  let service: AffiliateService;
  let userRepository: Repository<User>;
  let transactionRepository: Repository<CreditTransaction>;

  const mockUserRepository = {
    findOne: jest.fn(),
    count: jest.fn(),
    find: jest.fn(),
    findAndCount: jest.fn(),
  };

  const mockTransactionRepository = {
    createQueryBuilder: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AffiliateService,
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
        {
          provide: getRepositoryToken(CreditTransaction),
          useValue: mockTransactionRepository,
        },
      ],
    }).compile();

    service = module.get<AffiliateService>(AffiliateService);
    userRepository = module.get<Repository<User>>(getRepositoryToken(User));
    transactionRepository = module.get<Repository<CreditTransaction>>(
      getRepositoryToken(CreditTransaction),
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getStats', () => {
    const userId = 'user-123';
    const mockUser = {
      id: userId,
      affiliate_code: 'ABC123',
      username: 'testuser',
    } as User;

    const mockReferrals = [
      {
        id: 'ref-1',
        username: 'referral1',
        email: 'ref1@test.com',
        avatar_url: 'avatar1.jpg',
        created_at: new Date('2025-01-01'),
      },
      {
        id: 'ref-2',
        username: 'referral2',
        email: 'ref2@test.com',
        avatar_url: null,
        created_at: new Date('2025-01-02'),
      },
    ] as User[];

    beforeEach(() => {
      mockUserRepository.findOne.mockResolvedValue(mockUser);
      mockUserRepository.count.mockResolvedValue(2);
      mockUserRepository.find.mockResolvedValue(mockReferrals);
    });

    it('should return affiliate stats with referrals and earnings', async () => {
      // Mock query builder for earnings
      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getRawOne: jest.fn(),
      };

      mockQueryBuilder.getRawOne.mockResolvedValueOnce({ total: '500' }); // Total earnings
      mockQueryBuilder.getRawOne.mockResolvedValueOnce({ total: '100' }); // This month

      mockTransactionRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      // Mock environment variable
      process.env.FRONTEND_URL = 'http://localhost:3000';

      const result = await service.getStats(userId);

      expect(result).toHaveProperty('total_referrals', 2);
      expect(result).toHaveProperty('total_earnings', 500);
      expect(result).toHaveProperty('this_month_earnings', 100);
      expect(result).toHaveProperty('recent_referrals');
      expect(result.recent_referrals).toHaveLength(2);
      expect(result).toHaveProperty('referral_link');
      expect(result.referral_link).toContain('ABC123');
    });

    it('should return zero earnings when no transactions', async () => {
      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getRawOne: jest.fn(),
      };

      mockQueryBuilder.getRawOne.mockResolvedValueOnce({ total: null });
      mockQueryBuilder.getRawOne.mockResolvedValueOnce({ total: null });

      mockTransactionRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const result = await service.getStats(userId);

      expect(result.total_earnings).toBe(0);
      expect(result.this_month_earnings).toBe(0);
    });

    it('should throw NotFoundException if user not found', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      await expect(service.getStats(userId)).rejects.toThrow('User not found');
    });
  });

  describe('getReferrals', () => {
    const userId = 'user-123';
    const mockReferrals = [
      {
        id: 'ref-1',
        username: 'referral1',
        email: 'ref1@test.com',
        avatar_url: 'avatar1.jpg',
        created_at: new Date('2025-01-01'),
      },
    ] as User[];

    beforeEach(() => {
      mockUserRepository.findAndCount.mockResolvedValue([mockReferrals, 1]);
    });

    it('should return paginated referrals with spending data', async () => {
      // Mock query builder for total spent calculation (called once per referral)
      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ total: '250' }), // Total spent
      };

      mockTransactionRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);
      
      // Mock findOne for active check (called once per referral)
      mockTransactionRepository.findOne.mockResolvedValue({ id: 'tx-1' }); // Active check

      const result = await service.getReferrals(userId, 1, 20);

      expect(result).toHaveProperty('referrals');
      expect(result).toHaveProperty('total', 1);
      expect(result.referrals).toHaveLength(1);
      expect(result.referrals[0]).toHaveProperty('total_spent', 250);
      expect(result.referrals[0]).toHaveProperty('is_active', true);
    });

    it('should handle empty referrals list', async () => {
      mockUserRepository.findAndCount.mockResolvedValue([[], 0]);

      const result = await service.getReferrals(userId, 1, 20);

      expect(result.referrals).toHaveLength(0);
      expect(result.total).toBe(0);
    });
  });

  describe('getEarningsHistory', () => {
    const userId = 'user-123';
    const mockTransactions = [
      {
        id: 'tx-1',
        credit_amount: 100,
        description: 'Affiliate bonus',
        created_at: new Date('2025-01-15T10:00:00Z'),
      },
      {
        id: 'tx-2',
        credit_amount: 50,
        description: 'Affiliate bonus',
        created_at: new Date('2025-01-15T11:00:00Z'),
      },
      {
        id: 'tx-3',
        credit_amount: 75,
        description: 'Affiliate bonus',
        created_at: new Date('2025-01-16T10:00:00Z'),
      },
    ] as CreditTransaction[];

    it('should group earnings by date for month period', async () => {
      mockTransactionRepository.find.mockResolvedValue(mockTransactions);

      const result = await service.getEarningsHistory(userId, 'month');

      expect(result.length).toBeGreaterThan(0);
      // Check that transactions are grouped by date
      // Date format is 'YYYY-MM-DD' from toISOString().split('T')[0]
      const date15 = result.find((item) => item.date === '2025-01-15');
      expect(date15).toBeDefined();
      if (date15) {
        expect(date15.earnings).toBe(150); // 100 + 50 from tx-1 and tx-2
        expect(date15.transactions.length).toBe(2);
      }
      // Verify total earnings across all dates
      const totalEarnings = result.reduce((sum, item) => sum + item.earnings, 0);
      expect(totalEarnings).toBe(225); // 100 + 50 + 75
    });

    it('should return empty array when no earnings', async () => {
      mockTransactionRepository.find.mockResolvedValue([]);

      const result = await service.getEarningsHistory(userId, 'month');

      expect(result).toEqual([]);
    });
  });

  describe('validateAffiliateCode', () => {
    it('should return valid when code exists', async () => {
      const mockReferrer = {
        id: 'ref-1',
        username: 'referrer1',
        avatar_url: 'avatar.jpg',
      } as User;

      mockUserRepository.findOne.mockResolvedValue(mockReferrer);

      const result = await service.validateAffiliateCode('ABC123');

      expect(result.valid).toBe(true);
      expect(result.referrer).toBeDefined();
      expect(result.referrer.username).toBe('referrer1');
    });

    it('should return invalid when code does not exist', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      const result = await service.validateAffiliateCode('INVALID');

      expect(result.valid).toBe(false);
      expect(result.message).toBe('Invalid affiliate code');
    });

    it('should return invalid when code is empty', async () => {
      const result = await service.validateAffiliateCode('');

      expect(result.valid).toBe(false);
      expect(result.message).toBe('Affiliate code is required');
    });
  });

  describe('generateReferralLink', () => {
    it('should generate link with affiliate code', () => {
      process.env.FRONTEND_URL = 'http://localhost:3000';

      const link = (service as any).generateReferralLink('ABC123');

      expect(link).toBe('http://localhost:3000/register?ref=ABC123');
    });

    it('should return empty string when no affiliate code', () => {
      const link = (service as any).generateReferralLink(null);

      expect(link).toBe('');
    });
  });
});

