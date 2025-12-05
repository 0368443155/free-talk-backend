# PHASE 2 - UNIT TEST REVENUE SHARING LOGIC

**Ngày tạo:** 03/12/2025  
**Mục đích:** Unit tests chi tiết cho logic revenue sharing để đảm bảo không bao giờ bị sai  
**Trạng thái:** ✅ Test Specification Ready

---

## 🎯 MỤC TIÊU

Tạo bộ unit tests toàn diện cho revenue sharing logic để:
1. ✅ Đảm bảo logic tính toán đúng 100%
2. ✅ Prevent regression (không bao giờ bị sai lại)
3. ✅ Document expected behavior
4. ✅ Easy to maintain

---

## 📋 TEST SPECIFICATION

### Test File Location

`talkplatform-backend/src/features/credits/credits.service.spec.ts`

---

## 1. REVENUE SHARING POLICY TESTS

### Test Case 1: Organic Student (Platform Source)

**Scenario:** Student tự đăng ký, không qua referral link

**Expected:**
- Platform fee: 30%
- Teacher earning: 70%

**Test Code:**

```typescript
describe('Revenue Sharing - Organic Student', () => {
  it('should split revenue 30% platform, 70% teacher for organic student', async () => {
    // Arrange
    const meeting = {
      id: 'meeting-1',
      price_credits: 100,
      host: { id: 'teacher-1' }
    };
    
    const student = {
      id: 'student-1',
      referrer_id: null, // No referrer = organic
      affiliate_code: null
    };
    
    // Mock isAffiliateStudent to return false
    jest.spyOn(service as any, 'isAffiliateStudent').mockResolvedValue(false);
    
    // Act
    const result = await service.processClassPayment(meeting, student);
    
    // Assert
    expect(result.platform_fee).toBe(30); // 30% of 100
    expect(result.teacher_earning).toBe(70); // 70% of 100
    expect(result.revenue_share).toContain('30% platform');
    expect(result.revenue_share).toContain('70% teacher');
  });
});
```

---

### Test Case 2: Affiliate Student (Teacher Referral)

**Scenario:** Student đăng ký qua referral link của teacher

**Expected:**
- Platform fee: 10%
- Teacher earning: 90%

**Test Code:**

```typescript
describe('Revenue Sharing - Affiliate Student', () => {
  it('should split revenue 10% platform, 90% teacher for affiliate student', async () => {
    // Arrange
    const meeting = {
      id: 'meeting-1',
      price_credits: 100,
      host: { id: 'teacher-1' }
    };
    
    const student = {
      id: 'student-1',
      referrer_id: 'teacher-1', // Referred by this teacher
      affiliate_code: null
    };
    
    // Mock isAffiliateStudent to return true
    jest.spyOn(service as any, 'isAffiliateStudent').mockResolvedValue(true);
    
    // Act
    const result = await service.processClassPayment(meeting, student);
    
    // Assert
    expect(result.platform_fee).toBe(10); // 10% of 100
    expect(result.teacher_earning).toBe(90); // 90% of 100
    expect(result.revenue_share).toContain('10% platform');
    expect(result.revenue_share).toContain('90% teacher');
  });
});
```

---

### Test Case 3: Edge Cases

**Test Code:**

```typescript
describe('Revenue Sharing - Edge Cases', () => {
  it('should handle free class (0 credits)', async () => {
    const meeting = { price_credits: 0, host: { id: 'teacher-1' } };
    const student = { id: 'student-1', referrer_id: null };
    
    const result = await service.processClassPayment(meeting, student);
    
    expect(result.success).toBe(true);
    expect(result.amount_paid).toBe(0);
    expect(result.platform_fee).toBe(0);
    expect(result.teacher_earning).toBe(0);
  });

  it('should handle high value class (1000 credits)', async () => {
    const meeting = { price_credits: 1000, host: { id: 'teacher-1' } };
    const student = { id: 'student-1', referrer_id: 'teacher-1' };
    
    jest.spyOn(service as any, 'isAffiliateStudent').mockResolvedValue(true);
    
    const result = await service.processClassPayment(meeting, student);
    
    expect(result.platform_fee).toBe(100); // 10% of 1000
    expect(result.teacher_earning).toBe(900); // 90% of 1000
  });

  it('should throw error if student has insufficient balance', async () => {
    const meeting = { price_credits: 100, host: { id: 'teacher-1' } };
    const student = { 
      id: 'student-1', 
      referrer_id: null,
      credit_balance: 50 // Insufficient
    };
    
    await expect(
      service.processClassPayment(meeting, student)
    ).rejects.toThrow('Insufficient credits');
  });

  it('should handle odd amounts correctly (rounding)', async () => {
    const meeting = { price_credits: 99, host: { id: 'teacher-1' } };
    const student = { id: 'student-1', referrer_id: null };
    
    jest.spyOn(service as any, 'isAffiliateStudent').mockResolvedValue(false);
    
    const result = await service.processClassPayment(meeting, student);
    
    // 30% of 99 = 29.7, should round properly
    expect(result.platform_fee).toBeCloseTo(29.7, 1);
    expect(result.teacher_earning).toBeCloseTo(69.3, 1);
    expect(result.amount_paid).toBe(99);
  });
});
```

---

## 2. IS AFFILIATE STUDENT TESTS

### Test Case 4: Check Referrer ID Match

**Test Code:**

```typescript
describe('isAffiliateStudent', () => {
  it('should return true if student.referrer_id matches teacher.id', async () => {
    const student = { id: 'student-1', referrer_id: 'teacher-1' };
    const teacher = { id: 'teacher-1' };
    
    const result = await (service as any).isAffiliateStudent(student, teacher);
    
    expect(result).toBe(true);
  });

  it('should return false if student.referrer_id does not match', async () => {
    const student = { id: 'student-1', referrer_id: 'teacher-2' };
    const teacher = { id: 'teacher-1' };
    
    const result = await (service as any).isAffiliateStudent(student, teacher);
    
    expect(result).toBe(false);
  });

  it('should return false if student has no referrer', async () => {
    const student = { id: 'student-1', referrer_id: null };
    const teacher = { id: 'teacher-1' };
    
    const result = await (service as any).isAffiliateStudent(student, teacher);
    
    expect(result).toBe(false);
  });

  it('should return false if student refers to different teacher', async () => {
    const student = { 
      id: 'student-1', 
      referrer_id: 'teacher-2', // Referred by different teacher
      affiliate_code: null 
    };
    const teacher = { id: 'teacher-1' }; // Current meeting teacher
    
    const result = await (service as any).isAffiliateStudent(student, teacher);
    
    expect(result).toBe(false);
  });
});
```

---

## 3. TRANSACTION CREATION TESTS

### Test Case 5: Transaction Records

**Test Code:**

```typescript
describe('Transaction Records', () => {
  it('should create student deduction transaction', async () => {
    const meeting = { id: 'meeting-1', price_credits: 100, host: { id: 'teacher-1' } };
    const student = { id: 'student-1', referrer_id: null, credit_balance: 200 };
    
    jest.spyOn(service as any, 'isAffiliateStudent').mockResolvedValue(false);
    jest.spyOn(service['transactionRepository'], 'save').mockResolvedValue({} as any);
    
    await service.processClassPayment(meeting, student);
    
    expect(service['transactionRepository'].save).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: 'student-1',
        transaction_type: TransactionType.DEDUCTION,
        credit_amount: -100,
        platform_fee_percentage: 30,
        platform_fee_amount: 30,
      })
    );
  });

  it('should create teacher earning transaction', async () => {
    const meeting = { id: 'meeting-1', price_credits: 100, host: { id: 'teacher-1', credit_balance: 0 } };
    const student = { id: 'student-1', referrer_id: null, credit_balance: 200 };
    
    jest.spyOn(service as any, 'isAffiliateStudent').mockResolvedValue(false);
    
    await service.processClassPayment(meeting, student);
    
    expect(service['transactionRepository'].save).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: 'teacher-1',
        transaction_type: TransactionType.EARNING,
        credit_amount: 70,
        teacher_amount: 70,
      })
    );
  });
});
```

---

## 4. BALANCE UPDATE TESTS

### Test Case 6: Credit Balance Updates

**Test Code:**

```typescript
describe('Credit Balance Updates', () => {
  it('should deduct from student balance', async () => {
    const meeting = { id: 'meeting-1', price_credits: 100, host: { id: 'teacher-1', credit_balance: 0 } };
    const student = { id: 'student-1', referrer_id: null, credit_balance: 200 };
    
    jest.spyOn(service as any, 'isAffiliateStudent').mockResolvedValue(false);
    jest.spyOn(service['userRepository'], 'save').mockResolvedValue({} as any);
    
    await service.processClassPayment(meeting, student);
    
    // Student balance should decrease
    expect(student.credit_balance).toBe(100); // 200 - 100
  });

  it('should add to teacher balance for organic student', async () => {
    const meeting = { id: 'meeting-1', price_credits: 100, host: { id: 'teacher-1', credit_balance: 50 } };
    const student = { id: 'student-1', referrer_id: null, credit_balance: 200 };
    
    jest.spyOn(service as any, 'isAffiliateStudent').mockResolvedValue(false);
    
    await service.processClassPayment(meeting, student);
    
    // Teacher should get 70% = 70 credits
    expect(meeting.host.credit_balance).toBe(120); // 50 + 70
  });

  it('should add to teacher balance for affiliate student (90%)', async () => {
    const meeting = { id: 'meeting-1', price_credits: 100, host: { id: 'teacher-1', credit_balance: 50 } };
    const student = { id: 'student-1', referrer_id: 'teacher-1', credit_balance: 200 };
    
    jest.spyOn(service as any, 'isAffiliateStudent').mockResolvedValue(true);
    
    await service.processClassPayment(meeting, student);
    
    // Teacher should get 90% = 90 credits
    expect(meeting.host.credit_balance).toBe(140); // 50 + 90
  });
});
```

---

## 5. COMPREHENSIVE TEST SUITE

### Complete Test File Structure

```typescript
// src/features/credits/credits.service.spec.ts

import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { CreditsService } from './credits.service';
import { User } from '../../users/user.entity';
import { Transaction, TransactionType } from '../payments/entities/transaction.entity';
import { Meeting, MeetingStatus } from '../meeting/entities/meeting.entity';

describe('CreditsService - Revenue Sharing', () => {
  let service: CreditsService;
  let mockUserRepository: any;
  let mockTransactionRepository: any;
  let mockMeetingRepository: any;
  let mockDataSource: any;

  beforeEach(async () => {
    // Mock repositories
    mockUserRepository = {
      findOne: jest.fn(),
      save: jest.fn(),
      create: jest.fn(),
    };

    mockTransactionRepository = {
      create: jest.fn(),
      save: jest.fn(),
      find: jest.fn(),
    };

    mockMeetingRepository = {
      findOne: jest.fn(),
      save: jest.fn(),
    };

    mockDataSource = {
      createQueryRunner: jest.fn(),
      transaction: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreditsService,
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
        {
          provide: getRepositoryToken(Transaction),
          useValue: mockTransactionRepository,
        },
        {
          provide: getRepositoryToken(Meeting),
          useValue: mockMeetingRepository,
        },
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
      ],
    }).compile();

    service = module.get<CreditsService>(CreditsService);
  });

  describe('Revenue Sharing Policy', () => {
    describe('Organic Student (Platform Source)', () => {
      it('should split 30% platform, 70% teacher', async () => {
        const meeting = createMockMeeting(100);
        const student = createMockStudent(null, 200);
        
        mockIsAffiliateStudent(false);
        
        const result = await service.processClassPayment(meeting, student);
        
        expectRevenueSplit(result, {
          total: 100,
          platformFee: 30,
          teacherEarning: 70,
        });
      });

      it('should handle 99 credits correctly', async () => {
        const meeting = createMockMeeting(99);
        const student = createMockStudent(null, 200);
        
        mockIsAffiliateStudent(false);
        
        const result = await service.processClassPayment(meeting, student);
        
        expect(result.platform_fee).toBeCloseTo(29.7, 1); // 30% of 99
        expect(result.teacher_earning).toBeCloseTo(69.3, 1); // 70% of 99
      });
    });

    describe('Affiliate Student (Teacher Referral)', () => {
      it('should split 10% platform, 90% teacher', async () => {
        const meeting = createMockMeeting(100);
        const student = createMockStudent('teacher-1', 200);
        
        mockIsAffiliateStudent(true);
        
        const result = await service.processClassPayment(meeting, student);
        
        expectRevenueSplit(result, {
          total: 100,
          platformFee: 10,
          teacherEarning: 90,
        });
      });

      it('should handle 1000 credits correctly', async () => {
        const meeting = createMockMeeting(1000);
        const student = createMockStudent('teacher-1', 2000);
        
        mockIsAffiliateStudent(true);
        
        const result = await service.processClassPayment(meeting, student);
        
        expect(result.platform_fee).toBe(100); // 10% of 1000
        expect(result.teacher_earning).toBe(900); // 90% of 1000
      });
    });
  });

  describe('isAffiliateStudent Logic', () => {
    it('should return true when referrer_id matches teacher', async () => {
      const student = createMockStudent('teacher-1', 100);
      const teacher = { id: 'teacher-1' };
      
      const result = await (service as any).isAffiliateStudent(student, teacher);
      
      expect(result).toBe(true);
    });

    it('should return false when referrer_id does not match', async () => {
      const student = createMockStudent('teacher-2', 100);
      const teacher = { id: 'teacher-1' };
      
      const result = await (service as any).isAffiliateStudent(student, teacher);
      
      expect(result).toBe(false);
    });

    it('should return false when student has no referrer', async () => {
      const student = createMockStudent(null, 100);
      const teacher = { id: 'teacher-1' };
      
      const result = await (service as any).isAffiliateStudent(student, teacher);
      
      expect(result).toBe(false);
    });
  });

  describe('Edge Cases', () => {
    it('should handle free class (0 credits)', async () => {
      const meeting = createMockMeeting(0);
      const student = createMockStudent(null, 100);
      
      const result = await service.processClassPayment(meeting, student);
      
      expect(result.success).toBe(true);
      expect(result.amount_paid).toBe(0);
    });

    it('should throw error for insufficient balance', async () => {
      const meeting = createMockMeeting(100);
      const student = createMockStudent(null, 50); // Insufficient
      
      await expect(
        service.processClassPayment(meeting, student)
      ).rejects.toThrow('Insufficient credits');
    });
  });

  // Helper functions
  function createMockMeeting(price: number) {
    return {
      id: 'meeting-1',
      title: 'Test Meeting',
      price_credits: price,
      host: { id: 'teacher-1', credit_balance: 0 },
    } as any;
  }

  function createMockStudent(referrerId: string | null, balance: number) {
    return {
      id: 'student-1',
      referrer_id: referrerId,
      affiliate_code: null,
      credit_balance: balance,
    } as any;
  }

  function mockIsAffiliateStudent(isAffiliate: boolean) {
    jest.spyOn(service as any, 'isAffiliateStudent').mockResolvedValue(isAffiliate);
  }

  function expectRevenueSplit(result: any, expected: {
    total: number;
    platformFee: number;
    teacherEarning: number;
  }) {
    expect(result.amount_paid).toBe(expected.total);
    expect(result.platform_fee).toBe(expected.platformFee);
    expect(result.teacher_earning).toBe(expected.teacherEarning);
  }
});
```

---

## 6. TEST COVERAGE REQUIREMENTS

### Minimum Coverage Targets

- **Revenue Sharing Logic:** 100% coverage
- **isAffiliateStudent:** 100% coverage
- **Edge Cases:** All edge cases covered
- **Error Handling:** All error paths covered

### Test Categories

1. **Unit Tests** - Logic tính toán
2. **Integration Tests** - Transaction creation
3. **Edge Case Tests** - Boundary conditions
4. **Error Tests** - Exception handling

---

## 7. PREVENT REGRESSION

### Test Strategy

1. **Always run tests before deploy**
2. **Add tests for any new edge cases found**
3. **Update tests when policy changes**
4. **Document expected behavior in tests**

### CI/CD Integration

```yaml
# .github/workflows/test.yml
- name: Run Revenue Sharing Tests
  run: |
    npm test -- credits.service.spec.ts
    npm run test:cov -- credits.service.spec.ts
```

---

## 8. TEST EXAMPLES - COMPLETE FILE

File đầy đủ: Xem `docs/Phase2_Affiliate_System/TEST_EXAMPLES_COMPLETE.md`

---

**Created by:** AI Assistant  
**Date:** 03/12/2025  
**Version:** 1.0.0

