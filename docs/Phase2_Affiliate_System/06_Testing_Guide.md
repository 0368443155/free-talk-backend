# 06. Testing Guide (Detailed)

## 1. Automated Testing (E2E)

### 1.1. Setup Test Environment
Tạo file `test/affiliate.e2e-spec.ts`.

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from './../src/app.module';
import { getConnection } from 'typeorm';

describe('Affiliate System (E2E)', () => {
    let app: INestApplication;
    let teacherToken: string;
    let studentToken: string;
    let affiliateCode: string;

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();

        app = moduleFixture.createNestApplication();
        await app.init();

        // 1. Register Teacher & Get Token
        // ... (Helper function to register and login)
        
        // 2. Get Affiliate Code
        const res = await request(app.getHttpServer())
            .get('/api/v1/affiliate/link')
            .set('Authorization', `Bearer ${teacherToken}`);
        affiliateCode = res.body.code;
    });

    it('/auth/register (POST) - Should track referral', async () => {
        const res = await request(app.getHttpServer())
            .post('/api/v1/auth/register')
            .send({
                username: 'referred_student',
                email: 'student@test.com',
                password: 'password123',
                affiliate_code: affiliateCode // Use code from teacher
            });

        expect(res.status).toBe(201);
        
        // Verify DB
        const student = await getConnection().getRepository('User').findOne({ where: { email: 'student@test.com' } });
        const teacher = await getConnection().getRepository('User').findOne({ where: { affiliate_code: affiliateCode } });
        
        expect(student.referrer_id).toBe(teacher.id);
    });

    it('Should calculate revenue share correctly (10% platform)', async () => {
        // 1. Setup: Teacher creates meeting, Student joins
        // 2. Action: End meeting
        // 3. Verify: Check credit_transactions table
        
        // ... implementation details
    });
});
```

## 2. Manual Testing Checklist

### 2.1. Referral Tracking
| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1 | Truy cập `localhost:3000/register?ref=TESTCODE` | LocalStorage có key `talk_ref_code` = `TESTCODE` | |
| 2 | Điền form đăng ký và submit | API payload có field `affiliate_code` | |
| 3 | Check Database `users` table | User mới có `referrer_id` trỏ đúng user sở hữu code | |
| 4 | Dùng code sai `INVALID` | User vẫn tạo được, `referrer_id` = NULL, không lỗi crash | |

### 2.2. Revenue Sharing
| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1 | Student (Organic) join class 100 credits | Student -100, Teacher +70, Platform +30 | |
| 2 | Student (Referred) join class 100 credits | Student -100, Teacher +90, Platform +10 | |
| 3 | Meeting kết thúc | `payment_status` chuyển sang `COMPLETED` | |
| 4 | Student không đủ tiền | Transaction fail, log lỗi, Meeting `payment_status` = `PARTIAL` | |

### 2.3. Dashboard
| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1 | Vào `/dashboard/affiliate` | Hiển thị đúng Link và Code | |
| 2 | Copy link | Toast notification hiện lên "Copied" | |
| 3 | Check danh sách Referral | Hiển thị user vừa đăng ký ở bước 2.1 | |

## 3. SQL Verification Queries

### Verify Referrals
```sql
SELECT 
    r.username as referrer,
    u.username as student,
    u.created_at
FROM users u
JOIN users r ON u.referrer_id = r.id
ORDER BY u.created_at DESC;
```

### Verify Revenue Split
```sql
SELECT 
    m.id as meeting_id,
    t.username as teacher,
    ct.credit_amount as teacher_received,
    ct.platform_fee_amount as platform_fee,
    ct.platform_fee_percentage as rate
FROM credit_transactions ct
JOIN meetings m ON ct.meeting_id = m.id
JOIN users t ON ct.user_id = t.id
WHERE ct.transaction_type = 'earning';
```

## 4. Troubleshooting Common Issues

*   **Issue**: `referrer_id` is null after registration.
    *   **Check**: LocalStorage có lưu code không? Payload gửi lên API có code không? Code có valid trong DB không?
*   **Issue**: Revenue share sai (vẫn 30% thay vì 10%).
    *   **Check**: Logic `isAffiliateStudent` trong `CreditsService`. Đảm bảo `referrer_id` match với `meeting.host.id`.
*   **Issue**: Transaction bị rollback.
    *   **Check**: Logs backend xem lỗi gì (thường là deadlock hoặc data validation).
