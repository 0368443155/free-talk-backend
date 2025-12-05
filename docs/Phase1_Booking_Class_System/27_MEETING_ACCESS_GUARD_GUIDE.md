# HƯỚNG DẪN APPLY MEETING ACCESS GUARD

**Ngày:** 05/12/2025  
**Status:** 📋 PENDING - Cần xác nhận business logic  

---

## 🎯 MỤC ĐÍCH

Apply `MeetingAccessGuard` để kiểm tra quyền truy cập vào phòng học, đảm bảo:
1. Chỉ user có booking hợp lệ mới được join
2. Chỉ join trong khung giờ cho phép
3. Teacher có thể join sớm 10 phút

---

## ⚠️ VẤN ĐỀ CẦN XÁC NHẬN

### Guard Hiện Tại
File: `src/features/meeting/guards/meeting-access.guard.ts`

**Logic:**
- Kiểm tra booking CONFIRMED
- Kiểm tra time window (10 phút trước - end time)
- Teacher được join sớm 10 phút
- Kiểm tra payment (credits_paid > 0)

**Vấn đề:**
Guard này **CHỈ phù hợp cho Teacher Classes** (có booking), **KHÔNG phù hợp cho:**
- Free Talk Rooms (public, không cần booking)
- Public Meetings (mở cho tất cả)

---

## 🔍 PHÂN TÍCH CONTROLLERS

### 1. PublicMeetingsController
**File:** `src/features/meeting/public-meetings.controller.ts`  
**Route:** `/public-meetings`

**Endpoints:**
- `POST /:meetingId/join` (line 165-174) - Join meeting

**Business Logic:**
- Public meetings = Free Talk Rooms
- Không cần booking
- Ai cũng có thể join (nếu có account)

**Recommendation:** ❌ **KHÔNG NÊN** apply `MeetingAccessGuard`
- Vì không có booking requirement
- Cần guard khác (hoặc không cần guard)

---

### 2. MeetingsGeneralController
**File:** `src/features/meeting/meetings-general.controller.ts`  
**Route:** `/meetings`

**Endpoints:**
- Không có join endpoint
- Chỉ có CRUD operations

**Recommendation:** ❌ Không cần apply guard (không có join)

---

### 3. ClassroomsController
**File:** `src/features/meeting/classrooms.controller.ts`  
**Route:** `/classrooms`

**Cần kiểm tra:** File này có thể có join endpoint cho teacher classes

---

## 📋 ACTION PLAN

### Option 1: Tạo 2 Guards Riêng (RECOMMENDED)

#### 1.1 PublicMeetingAccessGuard
**Cho:** Free Talk Rooms, Public Meetings

**Logic:**
```typescript
- Check user authenticated
- Check meeting exists
- Check meeting not ended/cancelled
- Allow join (no booking required)
```

#### 1.2 TeacherClassAccessGuard
**Cho:** Teacher Classes (có booking)

**Logic:**
```typescript
- Check booking exists & confirmed
- Check time window
- Check payment
- Allow teacher join early
```

**Implementation:**
```bash
# Rename current guard
mv meeting-access.guard.ts teacher-class-access.guard.ts

# Create new guard
# public-meeting-access.guard.ts
```

---

### Option 2: Modify Guard Hiện Tại

Thêm logic để detect meeting type và apply rule tương ứng:

```typescript
async canActivate(context: ExecutionContext): Promise<boolean> {
  // ... existing code ...
  
  // Check meeting type
  if (meeting.meeting_type === 'free_talk' || meeting.is_public) {
    // Public meeting logic - no booking required
    return this.validatePublicMeetingAccess(meeting, user);
  } else {
    // Teacher class logic - booking required
    return this.validateTeacherClassAccess(meeting, user);
  }
}
```

---

### Option 3: Không Apply Guard (TEMPORARY)

Tạm thời không apply guard, để service layer handle logic:
- Service đã có logic check access
- Tránh duplicate validation
- Dễ maintain hơn

---

## 🎯 RECOMMENDATION

**Tôi khuyên dùng Option 1** vì:
1. ✅ Clear separation of concerns
2. ✅ Dễ test
3. ✅ Dễ maintain
4. ✅ Flexible cho future changes

---

## 📝 IMPLEMENTATION GUIDE

### Step 1: Rename Current Guard

```bash
cd src/features/meeting/guards
mv meeting-access.guard.ts teacher-class-access.guard.ts
```

Update class name:
```typescript
export class TeacherClassAccessGuard implements CanActivate {
  // ... existing logic ...
}
```

---

### Step 2: Create PublicMeetingAccessGuard

```typescript
// public-meeting-access.guard.ts
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Meeting, MeetingStatus } from '../entities/meeting.entity';

@Injectable()
export class PublicMeetingAccessGuard implements CanActivate {
  constructor(
    @InjectRepository(Meeting)
    private readonly meetingRepository: Repository<Meeting>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const meetingId = request.params.id || request.params.meetingId;

    if (!user || !meetingId) {
      throw new BadRequestException('Missing user or meeting ID');
    }

    // Get Meeting Info
    const meeting = await this.meetingRepository.findOne({
      where: { id: meetingId },
    });

    if (!meeting) {
      throw new BadRequestException('Meeting not found');
    }

    // Check Meeting Status
    if (meeting.status === MeetingStatus.ENDED || 
        meeting.status === MeetingStatus.CANCELLED) {
      throw new ForbiddenException('Meeting is closed or cancelled.');
    }

    // Check if meeting is locked
    if (meeting.is_locked) {
      throw new ForbiddenException('Meeting is locked.');
    }

    // Allow access for public meetings
    return true;
  }
}
```

---

### Step 3: Apply Guards to Controllers

#### For Public Meetings:
```typescript
// public-meetings.controller.ts
import { PublicMeetingAccessGuard } from './guards/public-meeting-access.guard';

@Post(':meetingId/join')
@UseGuards(JwtAuthGuard, PublicMeetingAccessGuard)
async joinMeeting(...) {
  // ...
}
```

#### For Teacher Classes:
```typescript
// (Find the right controller for teacher classes)
import { TeacherClassAccessGuard } from './guards/teacher-class-access.guard';

@Post(':meetingId/join')
@UseGuards(JwtAuthGuard, TeacherClassAccessGuard)
async joinMeeting(...) {
  // ...
}
```

---

### Step 4: Update Module

```typescript
// meetings.module.ts
import { TeacherClassAccessGuard } from './guards/teacher-class-access.guard';
import { PublicMeetingAccessGuard } from './guards/public-meeting-access.guard';

@Module({
  // ...
  providers: [
    // ...
    TeacherClassAccessGuard,
    PublicMeetingAccessGuard,
  ],
})
```

---

## 🧪 TESTING

### Test PublicMeetingAccessGuard

```typescript
// Test cases:
1. ✅ Authenticated user can join active public meeting
2. ❌ Unauthenticated user cannot join
3. ❌ Cannot join ended meeting
4. ❌ Cannot join cancelled meeting
5. ❌ Cannot join locked meeting
```

### Test TeacherClassAccessGuard

```typescript
// Test cases:
1. ✅ Student with confirmed booking can join
2. ✅ Teacher can join 10 minutes early
3. ❌ Student without booking cannot join
4. ❌ Student with cancelled booking cannot join
5. ❌ Cannot join before time window
6. ❌ Cannot join after class ended
7. ❌ Cannot join without payment
```

---

## ⏳ CURRENT STATUS

- [x] ✅ Guard created (TeacherClassAccessGuard)
- [ ] ⏳ Rename to TeacherClassAccessGuard
- [ ] ⏳ Create PublicMeetingAccessGuard
- [ ] ⏳ Apply to controllers
- [ ] ⏳ Update module
- [ ] ⏳ Write tests
- [ ] ⏳ Verify functionality

---

## 🚨 BLOCKERS

1. **Business Logic Clarification Needed:**
   - Xác nhận: Free Talk Rooms có cần booking không?
   - Xác nhận: Public meetings vs Teacher classes khác nhau như thế nào?
   - Xác nhận: Controller nào handle teacher classes?

2. **Technical Questions:**
   - Meeting type được phân biệt bằng field nào? (`meeting_type`? `is_public`?)
   - Có cần check capacity cho public meetings không?
   - Có cần check waiting room không?

---

## 📞 NEXT STEPS

### Immediate:
1. **Xác nhận business logic** với team
2. **Identify controller** cho teacher classes
3. **Decide approach** (Option 1, 2, or 3)

### After Confirmation:
1. Implement guards
2. Apply to controllers
3. Write tests
4. Deploy & verify

---

**Created by:** AI Assistant  
**Date:** 05/12/2025  
**Status:** ⏳ PENDING - Waiting for business logic confirmation  
**Priority:** 🟡 HIGH
