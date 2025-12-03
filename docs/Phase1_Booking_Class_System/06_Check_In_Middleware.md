# CHECK-IN MIDDLEWARE - BẢO MẬT PHÒNG HỌC

**Ngày tạo:** 03/12/2025  
**File:** 06_Check_In_Middleware.md  
**Thời gian:** 1 ngày

---

## 🎯 MỤC TIÊU

Ngăn chặn truy cập trái phép vào phòng học. Chỉ cho phép users có booking hợp lệ và đã thanh toán được join.

---

## 🛡️ SECURITY RULES

1. **Valid Booking:** User phải có booking `CONFIRMED` cho meeting đó.
2. **Time Window:** Chỉ được join trong khoảng `start_time - 10 phút` đến `end_time`.
3. **Role Check:** Teacher của lớp được join bất cứ lúc nào (trong khung giờ).
4. **Payment Check:** Booking phải có trạng thái thanh toán thành công (credits deducted).

---

## 💻 IMPLEMENTATION

### 1. Middleware Logic

```typescript
// File: src/features/meeting/guards/meeting-access.guard.ts

import { Injectable, CanActivate, ExecutionContext, ForbiddenException, BadRequestException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Booking, BookingStatus } from '../../booking/entities/booking.entity';
import { Meeting, MeetingState } from '../entities/meeting.entity';

@Injectable()
export class MeetingAccessGuard implements CanActivate {
  constructor(
    @InjectRepository(Booking)
    private readonly bookingRepository: Repository<Booking>,
    @InjectRepository(Meeting)
    private readonly meetingRepository: Repository<Meeting>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const meetingId = request.params.id;

    if (!user || !meetingId) {
      throw new BadRequestException('Missing user or meeting ID');
    }

    // 1. Get Meeting Info
    const meeting = await this.meetingRepository.findOne({ where: { id: meetingId } });
    if (!meeting) {
      throw new BadRequestException('Meeting not found');
    }

    // 2. Check Time Window (Cho phép vào sớm 10p)
    const now = new Date();
    const allowedStart = new Date(meeting.start_time.getTime() - 10 * 60000);
    
    if (now < allowedStart) {
      throw new ForbiddenException('Class has not started yet. You can join 10 minutes early.');
    }

    if (meeting.state === MeetingState.CLOSED || meeting.state === MeetingState.CANCELLED) {
      throw new ForbiddenException('Class is closed or cancelled.');
    }

    // 3. Check Role & Booking
    // Nếu là Teacher của lớp -> Allow
    if (meeting.teacher_id === user.id) {
      return true;
    }

    // Nếu là Student -> Check Booking
    const booking = await this.bookingRepository.findOne({
      where: {
        meeting_id: meetingId,
        student_id: user.id,
        status: BookingStatus.CONFIRMED,
      },
    });

    if (!booking) {
      throw new ForbiddenException('You do not have a valid booking for this class.');
    }

    return true;
  }
}
```

### 2. LiveKit Token Generation (Secure)

Chỉ generate token sau khi pass qua Guard.

```typescript
// File: src/features/meeting/meeting.controller.ts

@UseGuards(JwtAuthGuard, MeetingAccessGuard) // Apply Guard here
@Get(':id/join')
async joinMeeting(@Param('id') id: string, @Request() req) {
  const user = req.user;
  const meeting = await this.meetingService.findOne(id);

  // Generate LiveKit Token
  const token = await this.livekitService.createToken({
    roomName: meeting.id,
    participantIdentity: user.id,
    participantName: user.username,
  });

  return {
    token,
    ws_url: process.env.LIVEKIT_URL,
  };
}
```

---

## 🧪 TESTING SCENARIOS

| Scenario | User | Time | Expected Result |
|----------|------|------|-----------------|
| No Booking | Student A | During Class | ❌ 403 Forbidden |
| Has Booking | Student B | 20 mins early | ❌ 403 Too Early |
| Has Booking | Student B | 5 mins early | ✅ 200 OK |
| Teacher | Teacher | 30 mins early | ✅ 200 OK (Teacher allowed) |
| Class Ended | Student B | After Class | ❌ 403 Closed |

---

**Next:** `07_Testing_Guide.md`
