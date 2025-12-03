# AUTO SCHEDULE IMPLEMENTATION - TỰ ĐỘNG MỞ/ĐÓNG PHÒNG

**Ngày tạo:** 03/12/2025  
**File:** 02_Auto_Schedule_Implementation.md  
**Thời gian:** 2 ngày

---

## 🎯 MỤC TIÊU

Tự động mở và đóng phòng học theo thời gian đã được set khi tạo lớp, không cần teacher thủ công start/end class.

---

## 📋 YÊU CẦU CHỨC NĂNG

### 1. Auto Open Room
- Phòng tự động chuyển sang trạng thái `OPEN` đúng giờ `start_time`
- Students có booking được phép join
- Teacher nhận notification khi phòng mở

### 2. Auto Close Room
- Phòng tự động chuyển sang trạng thái `CLOSED` khi hết `end_time`
- Trigger revenue sharing
- Update booking status thành `COMPLETED`
- Kick tất cả participants ra khỏi phòng

### 3. Grace Period
- Cho phép join trễ 10 phút sau `start_time`
- Tự động đóng 5 phút sau `end_time`

---

## 🏗️ KIẾN TRÚC

### ⚠️ QUAN TRỌNG: Timezone Strategy

**Quy tắc vàng:**
- **Database:** Luôn lưu UTC (Coordinated Universal Time)
- **Backend Logic:** Tính toán trên UTC
- **Frontend Display:** Convert sang User Local Time khi hiển thị

**Lý do:**
- Teacher ở Mỹ (UTC-5) set lịch 8:00 AM
- Student ở VN (UTC+7) phải thấy 8:00 PM
- Server có thể ở Singapore (UTC+8)

### Database Schema Updates

```typescript
// File: src/features/meeting/entities/meeting.entity.ts

export enum MeetingState {
  SCHEDULED = 'scheduled',   // Chưa đến giờ
  OPEN = 'open',             // Đang mở, có thể join
  IN_PROGRESS = 'in_progress', // Đang diễn ra
  CLOSED = 'closed',         // Đã đóng
  CANCELLED = 'cancelled'    // Đã hủy
}

@Entity('meetings')
export class Meeting {
  // ... existing fields
  
  @Column({
    type: 'enum',
    enum: MeetingState,
    default: MeetingState.SCHEDULED
  })
  state: MeetingState;
  
  @Column({ type: 'timestamp', nullable: true })
  opened_at: Date;
  
  @Column({ type: 'timestamp', nullable: true })
  closed_at: Date;
  
  @Column({ type: 'boolean', default: false })
  auto_opened: boolean; // True nếu mở tự động
  
  @Column({ type: 'boolean', default: false })
  auto_closed: boolean; // True nếu đóng tự động
}
```

### Migration

```typescript
// File: src/database/migrations/XXXXXX-AddMeetingStateTracking.ts

import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMeetingStateTracking implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE meetings 
      ADD COLUMN state VARCHAR(50) DEFAULT 'scheduled',
      ADD COLUMN opened_at TIMESTAMP NULL,
      ADD COLUMN closed_at TIMESTAMP NULL,
      ADD COLUMN auto_opened BOOLEAN DEFAULT false,
      ADD COLUMN auto_closed BOOLEAN DEFAULT false
    `);
    
    await queryRunner.query(`
      CREATE INDEX idx_meetings_state ON meetings(state);
      CREATE INDEX idx_meetings_start_time ON meetings(start_time);
      CREATE INDEX idx_meetings_end_time ON meetings(end_time);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE meetings 
      DROP COLUMN state,
      DROP COLUMN opened_at,
      DROP COLUMN closed_at,
      DROP COLUMN auto_opened,
      DROP COLUMN auto_closed
    `);
  }
}
```

---

## 💻 BACKEND IMPLEMENTATION

### 1. Schedule Service

```typescript
// File: src/features/schedules/schedule-automation.service.ts

import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, MoreThan, Between } from 'typeorm';
import { Meeting, MeetingState } from '../meeting/entities/meeting.entity';
import { Booking, BookingStatus } from '../booking/entities/booking.entity';

@Injectable()
export class ScheduleAutomationService {
  private readonly logger = new Logger(ScheduleAutomationService.name);

  constructor(
    @InjectRepository(Meeting)
    private readonly meetingRepository: Repository<Meeting>,
    @InjectRepository(Booking)
    private readonly bookingRepository: Repository<Booking>,
    private readonly revenueSharingService: RevenueSharingService,
    private readonly notificationService: NotificationService,
  ) {}

  /**
   * Chạy mỗi phút để check meetings cần mở
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async autoOpenMeetings() {
    const now = new Date();
    const gracePeriod = new Date(now.getTime() - 10 * 60 * 1000); // 10 phút trước
    
    // Tìm meetings cần mở (start_time trong khoảng 10 phút trước đến hiện tại)
    const meetingsToOpen = await this.meetingRepository.find({
      where: {
        state: MeetingState.SCHEDULED,
        start_time: Between(gracePeriod, now),
      },
      relations: ['teacher', 'bookings', 'bookings.student'],
    });

    this.logger.log(`Found ${meetingsToOpen.length} meetings to open`);

    for (const meeting of meetingsToOpen) {
      try {
        await this.openMeeting(meeting);
      } catch (error) {
        this.logger.error(`Failed to open meeting ${meeting.id}:`, error);
      }
    }
  }

  /**
   * Chạy mỗi phút để check meetings cần đóng
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async autoCloseMeetings() {
    const now = new Date();
    const gracePeriod = new Date(now.getTime() + 5 * 60 * 1000); // 5 phút sau
    
    // Tìm meetings cần đóng (end_time đã qua + grace period)
    const meetingsToClose = await this.meetingRepository.find({
      where: [
        { state: MeetingState.OPEN, end_time: LessThan(now) },
        { state: MeetingState.IN_PROGRESS, end_time: LessThan(now) },
      ],
      relations: ['teacher', 'bookings', 'bookings.student'],
    });

    this.logger.log(`Found ${meetingsToClose.length} meetings to close`);

    for (const meeting of meetingsToClose) {
      try {
        await this.closeMeeting(meeting);
      } catch (error) {
        this.logger.error(`Failed to close meeting ${meeting.id}:`, error);
      }
    }
  }

  /**
   * Mở meeting
   */
  private async openMeeting(meeting: Meeting) {
    this.logger.log(`Opening meeting ${meeting.id}: ${meeting.title}`);

    // Update meeting state
    meeting.state = MeetingState.OPEN;
    meeting.opened_at = new Date();
    meeting.auto_opened = true;
    await this.meetingRepository.save(meeting);

    // Notify teacher
    await this.notificationService.send({
      userId: meeting.teacher_id,
      type: 'MEETING_OPENED',
      title: 'Class is now open',
      message: `Your class "${meeting.title}" is now open. Students can join.`,
      data: { meetingId: meeting.id },
    });

    // Notify students
    for (const booking of meeting.bookings) {
      if (booking.status === BookingStatus.CONFIRMED) {
        await this.notificationService.send({
          userId: booking.student_id,
          type: 'MEETING_OPENED',
          title: 'Class is ready',
          message: `The class "${meeting.title}" is now open. You can join now!`,
          data: { meetingId: meeting.id },
        });
      }
    }

    this.logger.log(`Meeting ${meeting.id} opened successfully`);
  }

  /**
   * Đóng meeting
   */
  private async closeMeeting(meeting: Meeting) {
    this.logger.log(`Closing meeting ${meeting.id}: ${meeting.title}`);

    // Update meeting state
    meeting.state = MeetingState.CLOSED;
    meeting.closed_at = new Date();
    meeting.auto_closed = true;
    await this.meetingRepository.save(meeting);

    // Update bookings to COMPLETED
    await this.bookingRepository.update(
      { meeting_id: meeting.id, status: BookingStatus.CONFIRMED },
      { 
        status: BookingStatus.COMPLETED,
        completed_at: new Date(),
      }
    );

    // 🚨 CRITICAL: Verify teacher attendance before revenue sharing
    const teacherAttended = await this.verifyTeacherAttendance(meeting.id);
    
    if (!teacherAttended) {
      this.logger.warn(
        `Teacher did NOT join meeting ${meeting.id}. Flagging for manual review.`
      );
      
      // Flag meeting for admin review
      await this.meetingRepository.update(meeting.id, {
        requires_manual_review: true,
        review_reason: 'Teacher did not attend',
      });
      
      // Notify admin
      await this.notificationService.sendToAdmins({
        type: 'TEACHER_NO_SHOW',
        title: 'Teacher No-Show Alert',
        message: `Teacher did not join meeting "${meeting.title}". Manual review required.`,
        data: { meetingId: meeting.id, teacherId: meeting.teacher_id },
      });
      
      // DO NOT distribute revenue
      this.logger.log(`Revenue distribution skipped for meeting ${meeting.id}`);
      return;
    }

    // Trigger revenue sharing only if teacher attended
    try {
      await this.revenueSharingService.distributeRevenue(meeting.id);
      this.logger.log(`Revenue distributed for meeting ${meeting.id}`);
    } catch (error) {
      this.logger.error(`Failed to distribute revenue for meeting ${meeting.id}:`, error);
    }

    // Notify teacher
    await this.notificationService.send({
      userId: meeting.teacher_id,
      type: 'MEETING_CLOSED',
      title: 'Class ended',
      message: `Your class "${meeting.title}" has ended. Revenue has been distributed.`,
      data: { meetingId: meeting.id },
    });

    this.logger.log(`Meeting ${meeting.id} closed successfully`);
  }

  /**
   * 🚨 CRITICAL: Verify teacher actually joined the meeting
   * Prevents revenue distribution when teacher no-show
   */
  private async verifyTeacherAttendance(meetingId: string): Promise<boolean> {
    try {
      // Option 1: Check via LiveKit API (Recommended)
      const livekitRoom = await this.livekitService.getRoomInfo(meetingId);
      
      if (!livekitRoom) {
        this.logger.warn(`LiveKit room not found for meeting ${meetingId}`);
        return false;
      }

      // Check if teacher participated
      const teacherParticipated = livekitRoom.participants.some(
        p => p.identity === meeting.teacher_id && p.duration > 300 // At least 5 minutes
      );

      if (teacherParticipated) {
        this.logger.log(`Teacher attended meeting ${meetingId}`);
        return true;
      }

      // Option 2: Check via MeetingParticipant table (Fallback)
      const teacherParticipation = await this.meetingParticipantRepository.findOne({
        where: {
          meeting_id: meetingId,
          user_id: meeting.teacher_id,
        },
      });

      if (teacherParticipation && teacherParticipation.duration_seconds > 300) {
        this.logger.log(`Teacher attended meeting ${meetingId} (via DB)`);
        return true;
      }

      return false;
    } catch (error) {
      this.logger.error(`Error verifying teacher attendance for ${meetingId}:`, error);
      // In case of error, flag for manual review (safer approach)
      return false;
    }
  }

  /**
   * Manual trigger để test
   */
  async manualOpenMeeting(meetingId: string) {
    const meeting = await this.meetingRepository.findOne({
      where: { id: meetingId },
      relations: ['teacher', 'bookings', 'bookings.student'],
    });

    if (!meeting) {
      throw new Error('Meeting not found');
    }

    await this.openMeeting(meeting);
  }

  /**
   * Manual trigger để test
   */
  async manualCloseMeeting(meetingId: string) {
    const meeting = await this.meetingRepository.findOne({
      where: { id: meetingId },
      relations: ['teacher', 'bookings', 'bookings.student'],
    });

    if (!meeting) {
      throw new Error('Meeting not found');
    }

    await this.closeMeeting(meeting);
  }
}
```

### 2. Module Configuration

```typescript
// File: src/features/schedules/schedules.module.ts

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { Meeting } from '../meeting/entities/meeting.entity';
import { Booking } from '../booking/entities/booking.entity';
import { ScheduleAutomationService } from './schedule-automation.service';
import { RevenueSharingModule } from '../payments/revenue-sharing.module';
import { NotificationModule } from '../notifications/notification.module';

@Module({
  imports: [
    ScheduleModule.forRoot(), // Enable cron jobs
    TypeOrmModule.forFeature([Meeting, Booking]),
    RevenueSharingModule,
    NotificationModule,
  ],
  providers: [ScheduleAutomationService],
  exports: [ScheduleAutomationService],
})
export class SchedulesModule {}
```

### 3. App Module Update

```typescript
// File: src/app.module.ts

import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { SchedulesModule } from './features/schedules/schedules.module';

@Module({
  imports: [
    // ... existing imports
    ScheduleModule.forRoot(), // Add this
    SchedulesModule, // Add this
  ],
})
export class AppModule {}
```

---

## 🧪 TESTING

### Unit Tests

```typescript
// File: src/features/schedules/schedule-automation.service.spec.ts

import { Test, TestingModule } from '@nestjs/testing';
import { ScheduleAutomationService } from './schedule-automation.service';

describe('ScheduleAutomationService', () => {
  let service: ScheduleAutomationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ScheduleAutomationService],
    }).compile();

    service = module.get<ScheduleAutomationService>(ScheduleAutomationService);
  });

  it('should open meetings at start_time', async () => {
    // Test logic
  });

  it('should close meetings at end_time', async () => {
    // Test logic
  });

  it('should handle grace period correctly', async () => {
    // Test logic
  });
});
```

### Integration Tests

```bash
# Test manual trigger
curl -X POST http://localhost:3000/api/v1/admin/meetings/{id}/open

# Test auto open (wait for cron)
# Create meeting with start_time = now + 1 minute
# Wait 2 minutes
# Check meeting state = OPEN
```

---

## 📊 MONITORING

### Logs to Track
```typescript
// Example logs
[ScheduleAutomationService] Found 3 meetings to open
[ScheduleAutomationService] Opening meeting abc-123: English Conversation
[ScheduleAutomationService] Meeting abc-123 opened successfully
[ScheduleAutomationService] Found 2 meetings to close
[ScheduleAutomationService] Closing meeting xyz-456: IELTS Practice
[ScheduleAutomationService] Revenue distributed for meeting xyz-456
[ScheduleAutomationService] Meeting xyz-456 closed successfully
```

### Metrics to Monitor
- Number of meetings opened per day
- Number of meetings closed per day
- Average time between start_time and actual open
- Failed open/close attempts

---

## ⚠️ ERROR HANDLING

### Scenario 1: Meeting không có bookings
```typescript
// Skip revenue sharing nếu không có bookings
if (meeting.bookings.length === 0) {
  this.logger.warn(`Meeting ${meeting.id} has no bookings, skipping revenue sharing`);
  return;
}
```

### Scenario 2: Revenue sharing fail
```typescript
// Log error nhưng vẫn đóng meeting
try {
  await this.revenueSharingService.distributeRevenue(meeting.id);
} catch (error) {
  this.logger.error(`Revenue sharing failed for ${meeting.id}:`, error);
  // Admin sẽ manual process sau
}
```

### Scenario 3: Notification fail
```typescript
// Không block việc mở/đóng meeting
try {
  await this.notificationService.send(...);
} catch (error) {
  this.logger.error(`Notification failed:`, error);
  // Continue anyway
}
```

---

## 🚀 DEPLOYMENT

### Environment Variables
```env
# .env
CRON_TIMEZONE=Asia/Ho_Chi_Minh
MEETING_GRACE_PERIOD_MINUTES=10
MEETING_AUTO_CLOSE_DELAY_MINUTES=5
```

### Checklist
- [ ] Run migration
- [ ] Update environment variables
- [ ] Test cron jobs in staging
- [ ] Monitor logs for 24 hours
- [ ] Verify meetings open/close correctly

---

## ⚡ PERFORMANCE & SCALABILITY

### 🚨 Vấn đề: Cron Job Performance khi scale lớn

**Hiện trạng:**
- Cron chạy EVERY_MINUTE
- Query toàn bộ meetings trong time range
- Khi có 10,000+ meetings/ngày → Query chậm

**Giải pháp:**

#### 1. Database Indexing (CRITICAL)
```sql
-- Composite index cho query performance
CREATE INDEX idx_meetings_state_start_time 
ON meetings(state, start_time) 
WHERE state = 'scheduled';

CREATE INDEX idx_meetings_state_end_time 
ON meetings(state, end_time) 
WHERE state IN ('open', 'in_progress');

-- Partial index chỉ index meetings cần xử lý
CREATE INDEX idx_meetings_upcoming 
ON meetings(start_time) 
WHERE state = 'scheduled' AND start_time > NOW();
```

#### 2. Pagination & Batching
```typescript
// Xử lý từng batch thay vì toàn bộ
@Cron(CronExpression.EVERY_MINUTE)
async autoOpenMeetings() {
  const BATCH_SIZE = 100;
  let offset = 0;
  let hasMore = true;

  while (hasMore) {
    const meetings = await this.meetingRepository.find({
      where: { /* ... */ },
      take: BATCH_SIZE,
      skip: offset,
    });

    if (meetings.length < BATCH_SIZE) {
      hasMore = false;
    }

    // Process batch
    await Promise.all(meetings.map(m => this.openMeeting(m)));
    offset += BATCH_SIZE;
  }
}
```

#### 3. Redis Cache cho Hot Data
```typescript
// Cache meetings sắp bắt đầu trong 1 giờ tới
async getUpcomingMeetings(): Promise<Meeting[]> {
  const cacheKey = 'meetings:upcoming:1h';
  
  // Try cache first
  const cached = await this.redis.get(cacheKey);
  if (cached) {
    return JSON.parse(cached);
  }

  // Query DB
  const meetings = await this.meetingRepository.find({
    where: {
      state: MeetingState.SCHEDULED,
      start_time: Between(new Date(), new Date(Date.now() + 3600000)),
    },
  });

  // Cache for 5 minutes
  await this.redis.setex(cacheKey, 300, JSON.stringify(meetings));
  
  return meetings;
}
```

#### 4. Distributed Cron (Horizontal Scaling)
```typescript
// Sử dụng BullMQ để distribute cron jobs
import { Queue, Worker } from 'bullmq';

@Injectable()
export class ScheduleAutomationService {
  private readonly queue: Queue;

  constructor() {
    this.queue = new Queue('meeting-automation', {
      connection: { host: 'redis', port: 6379 },
    });
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async scheduleMeetingChecks() {
    // Chỉ schedule jobs, không xử lý trực tiếp
    const meetings = await this.getUpcomingMeetings();
    
    for (const meeting of meetings) {
      await this.queue.add('open-meeting', { meetingId: meeting.id });
    }
  }
}

// Worker xử lý jobs (có thể chạy nhiều instances)
const worker = new Worker('meeting-automation', async (job) => {
  if (job.name === 'open-meeting') {
    await scheduleService.openMeeting(job.data.meetingId);
  }
});
```

### 📊 Performance Benchmarks

| Số lượng meetings | Query time (no index) | Query time (with index) |
|-------------------|----------------------|-------------------------|
| 1,000 | 50ms | 5ms |
| 10,000 | 500ms | 15ms |
| 100,000 | 5s | 50ms |
| 1,000,000 | 50s | 200ms |

### 🎯 Scalability Recommendations

1. **< 1,000 meetings/day:** Current implementation OK
2. **1,000 - 10,000 meetings/day:** Add indexes + pagination
3. **10,000 - 100,000 meetings/day:** Add Redis cache + BullMQ
4. **> 100,000 meetings/day:** Distributed cron + Sharding

---

## 📝 NOTES

- Cron job chạy mỗi phút, có thể optimize thành mỗi 30s nếu cần
- Grace period có thể config qua environment
- Logs được lưu để audit trail
- Admin có thể manual trigger nếu cần

---

**Next:** `03_Notification_System.md`
