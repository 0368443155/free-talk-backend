# 🚀 Phase 2 to Phase 3 Transition Guide

## ✅ Phase 2 Complete

**Backend**: ✅ Done  
**Frontend**: ✅ Done  
**Migration**: ⚠️ Needs manual run

---

## 📋 Before Phase 3: Run Migration

### Option 1: Update data-source.ts (Recommended)

Add enrollment entities to `data-source.ts`:

```typescript
// Add these imports at top
import { Course } from './src/features/courses/entities/course.entity';
import { CourseSession } from './src/features/courses/entities/course-session.entity';
import { CourseEnrollment } from './src/features/courses/entities/enrollment.entity';
import { SessionPurchase } from './src/features/courses/entities/session-purchase.entity';
import { PaymentHold } from './src/features/courses/entities/payment-hold.entity';

// Add to entities array
entities: [
  User,
  TeacherProfile,
  Meeting,
  MeetingParticipant,
  MeetingChatMessage,
  Classroom,
  ClassroomMember,
  BandwidthMetric,
  MetricsHourly,
  LiveKitMetric,
  Course,              // ← ADD
  CourseSession,       // ← ADD
  CourseEnrollment,    // ← ADD
  SessionPurchase,     // ← ADD
  PaymentHold,         // ← ADD
],
```

Then run:
```bash
cd talkplatform-backend
npm run migration:run
```

### Option 2: Manual SQL (Alternative)

Run the SQL from migration file directly in MySQL:
```bash
# File: src/database/migrations/1764070000000-CreateEnrollmentTables.ts
# Copy the SQL and run in MySQL Workbench or CLI
```

---

## 🎯 Phase 3: Payment Auto-Release System

### Overview

**Goal**: Automatically release payments to teachers after session completion based on attendance.

**Rules**:
- ✅ Attendance >= 20% → Release payment to teacher
- ❌ Attendance < 20% → Refund to student
- 💰 Commission: 70% if referred by teacher, 30% otherwise

### Architecture

```
LiveKit Session
      ↓
  Webhooks
      ↓
Track Attendance
      ↓
Session Ends
      ↓
Calculate %
      ↓
  >= 20%?
   ↙    ↘
 YES    NO
  ↓      ↓
Release Refund
Payment Student
  ↓
Teacher
Balance
```

---

## 📝 Phase 3 Implementation Plan

### Backend Tasks

#### 1. Create Transaction Entities
- `Transaction` - All financial transactions
- `Withdrawal` - Teacher withdrawal requests

#### 2. Attendance Tracking Service
- LiveKit webhook handler
- Track participant join/leave
- Calculate attendance duration
- Store in Redis/Database

#### 3. Payment Release Service
- Cron job (runs every 5 minutes)
- Find completed sessions
- Calculate attendance %
- Release or refund payments
- Update teacher balance

#### 4. Withdrawal System
- Request withdrawal API
- Admin approval workflow
- Bank transfer integration

#### 5. Revenue Dashboard API
- Teacher total earnings
- Available balance
- Pending payments
- Transaction history

### Frontend Tasks

#### 1. Teacher Revenue Dashboard
- Total earnings display
- Available balance
- Pending payments list
- Withdrawal history

#### 2. Withdrawal Request Form
- Enter amount
- Bank account info
- Submit request

#### 3. Transaction History
- All transactions
- Filters (type, date, status)
- Export to CSV

#### 4. Student Credit Management
- Current balance
- Add credit (payment gateway)
- Transaction history

---

## 🔧 Technical Details

### Database Tables Needed

```sql
-- transactions table
CREATE TABLE transactions (
  id UUID PRIMARY KEY,
  user_id UUID,
  type VARCHAR(50), -- deposit, purchase, refund, commission, withdrawal
  amount DECIMAL(10,2),
  balance_before DECIMAL(10,2),
  balance_after DECIMAL(10,2),
  status VARCHAR(50),
  reference_type VARCHAR(50),
  reference_id UUID,
  description TEXT,
  metadata JSON,
  created_at TIMESTAMP,
  completed_at TIMESTAMP
);

-- withdrawals table
CREATE TABLE withdrawals (
  id UUID PRIMARY KEY,
  teacher_id UUID,
  amount DECIMAL(10,2),
  status VARCHAR(50), -- pending, processing, completed, rejected
  bank_account_info JSON,
  requested_at TIMESTAMP,
  processed_at TIMESTAMP,
  completed_at TIMESTAMP,
  notes TEXT
);
```

### LiveKit Webhooks

```typescript
@Post('webhooks/livekit')
async handleLivekitWebhook(@Body() event: any) {
  switch (event.event) {
    case 'participant_joined':
      await this.trackJoin(event);
      break;
    case 'participant_left':
      await this.trackLeave(event);
      break;
    case 'room_finished':
      await this.processSessionEnd(event);
      break;
  }
}
```

### Auto-Release Cron

```typescript
@Cron('*/5 * * * *') // Every 5 minutes
async autoReleasePayments() {
  const completedSessions = await this.findCompletedSessions();
  
  for (const session of completedSessions) {
    const purchases = await this.findPurchases(session.id);
    
    for (const purchase of purchases) {
      const attendancePercent = this.calculateAttendance(purchase);
      
      if (attendancePercent >= 20) {
        await this.releaseToTeacher(purchase);
      } else {
        await this.refundToStudent(purchase);
      }
    }
  }
}
```

---

## 🎯 Next Steps

### Immediate Actions:

1. **Fix data-source.ts** - Add enrollment entities
2. **Run migration** - Create enrollment tables
3. **Test Phase 2** - Verify enrollment flow works
4. **Start Phase 3** - Begin payment auto-release

### Phase 3 Timeline:

- **Day 1**: Transaction entities + migration
- **Day 2**: Attendance tracking service
- **Day 3**: Payment release service + cron
- **Day 4**: Withdrawal system
- **Day 5**: Frontend dashboards

---

## 📊 Current Status

```
✅ Phase 1: Course Management (100%)
✅ Phase 2: Enrollment System (100%)
⏳ Phase 2.5: Run Migration (Pending)
🚀 Phase 3: Payment Auto-Release (Ready to start)
```

**Blocker**: Migration needs to run before Phase 3

**Action Required**: Update `data-source.ts` and run `npm run migration:run`

---

## 🆘 Troubleshooting

### Migration Fails?

1. Check MySQL is running
2. Check `.env` database credentials
3. Check `data-source.ts` has all entities
4. Try manual SQL execution

### Entities Not Found?

Make sure imports are correct:
```typescript
import { Course } from './src/features/courses/entities/course.entity';
// NOT: './src/features/courses/course.entity'
```

---

Ready to proceed with Phase 3! 🚀
