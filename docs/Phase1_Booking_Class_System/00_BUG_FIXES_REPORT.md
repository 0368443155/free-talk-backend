# BUG FIXES - PHASE 1 DOCUMENTATION

**Ngày phát hiện:** 03/12/2025  
**Người kiểm tra:** AI Assistant  
**Trạng thái:** CRITICAL BUGS FOUND

---

## 🚨 CRITICAL BUGS

### Bug #1: Variable Scope Error trong `verifyTeacherAttendance`

**File:** `02_Auto_Schedule_Implementation.md`  
**Dòng:** 330, 342  
**Mức độ:** 🔴 CRITICAL

**Mô tả:**
Hàm `verifyTeacherAttendance(meetingId: string)` chỉ nhận parameter là `meetingId` (string), nhưng trong body của hàm lại tham chiếu đến biến `meeting.teacher_id` (dòng 330, 342) - biến này không tồn tại trong scope.

**Code lỗi:**
```typescript
private async verifyTeacherAttendance(meetingId: string): Promise<boolean> {
  try {
    const livekitRoom = await this.livekitService.getRoomInfo(meetingId);
    
    // ❌ LỖI: 'meeting' is not defined
    const teacherParticipated = livekitRoom.participants.some(
      p => p.identity === meeting.teacher_id && p.duration > 300
    );
    
    // ❌ LỖI: 'meeting' is not defined
    const teacherParticipation = await this.meetingParticipantRepository.findOne({
      where: {
        meeting_id: meetingId,
        user_id: meeting.teacher_id, // ❌ Lỗi ở đây
      },
    });
  }
}
```

**Giải pháp:**
Cần fetch meeting object trước khi sử dụng:

```typescript
private async verifyTeacherAttendance(meetingId: string): Promise<boolean> {
  try {
    // ✅ Fetch meeting object first
    const meeting = await this.meetingRepository.findOne({
      where: { id: meetingId },
    });

    if (!meeting) {
      this.logger.warn(`Meeting ${meetingId} not found`);
      return false;
    }

    // Option 1: Check via LiveKit API
    const livekitRoom = await this.livekitService.getRoomInfo(meetingId);
    
    if (!livekitRoom) {
      this.logger.warn(`LiveKit room not found for meeting ${meetingId}`);
      return false;
    }

    // ✅ Now 'meeting' is defined
    const teacherParticipated = livekitRoom.participants.some(
      p => p.identity === meeting.teacher_id && p.duration > 300
    );

    if (teacherParticipated) {
      this.logger.log(`Teacher attended meeting ${meetingId}`);
      return true;
    }

    // Option 2: Check via MeetingParticipant table (Fallback)
    const teacherParticipation = await this.meetingParticipantRepository.findOne({
      where: {
        meeting_id: meetingId,
        user_id: meeting.teacher_id, // ✅ Now works
      },
    });

    if (teacherParticipation && teacherParticipation.duration_seconds > 300) {
      this.logger.log(`Teacher attended meeting ${meetingId} (via DB)`);
      return true;
    }

    return false;
  } catch (error) {
    this.logger.error(`Error verifying teacher attendance for ${meetingId}:`, error);
    return false;
  }
}
```

---

### Bug #2: Missing Dependency Injection

**File:** `02_Auto_Schedule_Implementation.md`  
**Dòng:** 144-151  
**Mức độ:** 🟡 HIGH

**Mô tả:**
Constructor của `ScheduleAutomationService` thiếu inject `livekitService` và `meetingParticipantRepository` nhưng code lại sử dụng chúng trong `verifyTeacherAttendance`.

**Code lỗi:**
```typescript
constructor(
  @InjectRepository(Meeting)
  private readonly meetingRepository: Repository<Meeting>,
  @InjectRepository(Booking)
  private readonly bookingRepository: Repository<Booking>,
  private readonly revenueSharingService: RevenueSharingService,
  private readonly notificationService: NotificationService,
) {}
// ❌ Thiếu livekitService và meetingParticipantRepository
```

**Giải pháp:**
```typescript
constructor(
  @InjectRepository(Meeting)
  private readonly meetingRepository: Repository<Meeting>,
  @InjectRepository(Booking)
  private readonly bookingRepository: Repository<Booking>,
  @InjectRepository(MeetingParticipant) // ✅ Thêm
  private readonly meetingParticipantRepository: Repository<MeetingParticipant>,
  private readonly revenueSharingService: RevenueSharingService,
  private readonly notificationService: NotificationService,
  private readonly livekitService: LiveKitService, // ✅ Thêm
) {}
```

---

### Bug #3: Missing Entity Import

**File:** `02_Auto_Schedule_Implementation.md`  
**Dòng:** 130-138  
**Mức độ:** 🟡 HIGH

**Mô tả:**
Import statement thiếu `MeetingParticipant` entity và `LiveKitService`.

**Code lỗi:**
```typescript
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, MoreThan, Between } from 'typeorm';
import { Meeting, MeetingState } from '../meeting/entities/meeting.entity';
import { Booking, BookingStatus } from '../booking/entities/booking.entity';
// ❌ Thiếu MeetingParticipant và LiveKitService
```

**Giải pháp:**
```typescript
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, MoreThan, Between } from 'typeorm';
import { Meeting, MeetingState } from '../meeting/entities/meeting.entity';
import { Booking, BookingStatus } from '../booking/entities/booking.entity';
import { MeetingParticipant } from '../meeting/entities/meeting-participant.entity'; // ✅ Thêm
import { LiveKitService } from '../../infrastructure/livekit/livekit.service'; // ✅ Thêm
import { RevenueSharingService } from '../payments/revenue-sharing.service';
import { NotificationService } from '../notifications/notification.service';
```

---

### Bug #4: Missing Database Fields in Migration

**File:** `02_Auto_Schedule_Implementation.md`  
**Dòng:** 61-83  
**Mức độ:** 🟡 MEDIUM

**Mô tả:**
Entity Meeting có thêm 2 fields mới (`requires_manual_review`, `review_reason`) được sử dụng trong code (dòng 276-279) nhưng không có trong schema definition và migration.

**Giải pháp:**
Thêm vào Entity:
```typescript
@Entity('meetings')
export class Meeting {
  // ... existing fields
  
  @Column({ type: 'boolean', default: false })
  requires_manual_review: boolean; // ✅ Thêm
  
  @Column({ type: 'varchar', length: 500, nullable: true })
  review_reason: string; // ✅ Thêm
}
```

Thêm vào Migration:
```typescript
await queryRunner.query(`
  ALTER TABLE meetings 
  ADD COLUMN state VARCHAR(50) DEFAULT 'scheduled',
  ADD COLUMN opened_at TIMESTAMP NULL,
  ADD COLUMN closed_at TIMESTAMP NULL,
  ADD COLUMN auto_opened BOOLEAN DEFAULT false,
  ADD COLUMN auto_closed BOOLEAN DEFAULT false,
  ADD COLUMN requires_manual_review BOOLEAN DEFAULT false, -- ✅ Thêm
  ADD COLUMN review_reason VARCHAR(500) NULL -- ✅ Thêm
`);
```

---

## ⚠️ WARNINGS

### Warning #1: Missing MeetingParticipant Entity Definition

**File:** `02_Auto_Schedule_Implementation.md`  
**Mức độ:** 🟡 MEDIUM

**Mô tả:**
Code tham chiếu đến entity `MeetingParticipant` nhưng không có definition trong tài liệu.

**Giải pháp:**
Cần tạo entity này:
```typescript
// File: src/features/meeting/entities/meeting-participant.entity.ts

@Entity('meeting_participants')
export class MeetingParticipant {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  meeting_id: string;

  @Column({ type: 'uuid' })
  user_id: string;

  @Column({ type: 'int', default: 0 })
  duration_seconds: number;

  @Column({ type: 'timestamp' })
  joined_at: Date;

  @Column({ type: 'timestamp', nullable: true })
  left_at: Date;

  @CreateDateColumn()
  created_at: Date;
}
```

---

### Warning #2: Missing sendToAdmins Method

**File:** `02_Auto_Schedule_Implementation.md`  
**Dòng:** 283  
**Mức độ:** 🟡 MEDIUM

**Mô tả:**
Code gọi `notificationService.sendToAdmins()` nhưng method này không được định nghĩa trong NotificationService.

**Giải pháp:**
Thêm method vào NotificationService:
```typescript
async sendToAdmins(dto: {
  type: string;
  title: string;
  message: string;
  data?: any;
}): Promise<void> {
  // Get all admin users
  const admins = await this.userRepository.find({
    where: { role: UserRole.ADMIN },
  });

  // Send notification to each admin
  for (const admin of admins) {
    await this.send({
      userId: admin.id,
      type: NotificationType.IN_APP,
      title: dto.title,
      message: dto.message,
      data: dto.data,
    });
  }
}
```

---

## 📊 SUMMARY

| Bug ID | Severity | Status | File |
|--------|----------|--------|------|
| Bug #1 | 🔴 CRITICAL | NEEDS FIX | 02_Auto_Schedule_Implementation.md |
| Bug #2 | 🟡 HIGH | NEEDS FIX | 02_Auto_Schedule_Implementation.md |
| Bug #3 | 🟡 HIGH | NEEDS FIX | 02_Auto_Schedule_Implementation.md |
| Bug #4 | 🟡 MEDIUM | NEEDS FIX | 02_Auto_Schedule_Implementation.md |
| Warning #1 | 🟡 MEDIUM | NEEDS IMPLEMENTATION | - |
| Warning #2 | 🟡 MEDIUM | NEEDS IMPLEMENTATION | 03_Notification_System.md |

---

## ✅ ACTION ITEMS

1. **Immediate (CRITICAL):**
   - [ ] Fix Bug #1: Add meeting fetch in `verifyTeacherAttendance`
   - [ ] Fix Bug #2: Add missing dependencies to constructor
   - [ ] Fix Bug #3: Add missing imports

2. **High Priority:**
   - [ ] Fix Bug #4: Add missing fields to migration
   - [ ] Create MeetingParticipant entity
   - [ ] Add sendToAdmins method to NotificationService

3. **Documentation:**
   - [ ] Update all affected files with corrected code
   - [ ] Add changelog entry
   - [ ] Update testing guide with new scenarios

---

**Next Steps:** Tôi sẽ tạo các file corrected versions ngay bây giờ.
