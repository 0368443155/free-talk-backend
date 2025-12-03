# 🎯 Quick Reference: Modular Room System

## 📋 Tóm Tắt Nhanh

Hệ thống được module hóa để:
- ✅ Tái sử dụng code cho nhiều loại phòng
- ✅ Dễ dàng thêm/bớt features cho từng loại phòng
- ✅ Scale up hệ thống mà không cần viết lại code
- ✅ Maintain dễ dàng hơn

---

## 🏗️ Kiến Trúc Tổng Quan

```
┌─────────────────────────────────────────────────────────┐
│                    Room Factory                         │
│         (Tạo room service theo room type)               │
└────────────────┬────────────────────────────────────────┘
                 │
        ┌────────┴────────┐
        │                 │
        ▼                 ▼
┌──────────────┐  ┌──────────────┐
│ Free Talk    │  │ Lesson Room  │
│ Room Service │  │ Service      │
└──────┬───────┘  └──────┬───────┘
       │                 │
       └────────┬────────┘
                │
                ▼
        ┌───────────────┐
        │ Base Room     │
        │ Service       │
        └───────┬───────┘
                │
    ┌───────────┼───────────┐
    │           │           │
    ▼           ▼           ▼
┌────────┐ ┌────────┐ ┌────────┐
│ Chat   │ │YouTube │ │Waiting │
│ Module │ │ Module │ │  Room  │
└────────┘ └────────┘ └────────┘
```

---

## 📦 Các Module Chính

### 1. Core Modules (Nền tảng)

#### `RoomModule`
- **Location:** `src/core/room/`
- **Purpose:** Quản lý room types và configurations
- **Key Components:**
  - `RoomFactoryService` - Tạo room service instances
  - `BaseRoomService` - Abstract class cho tất cả room services
  - Room configs (FREE_TALK, LESSON, TEACHER_CLASS)

#### `AccessControlModule`
- **Location:** `src/core/access-control/`
- **Purpose:** Kiểm tra quyền truy cập
- **Key Components:**
  - `AccessValidatorService` - Validate access tổng hợp
  - `EnrollmentCheckerService` - Check enrollment
  - `TimeBasedAccessService` - Check time restrictions

---

### 2. Feature Modules (Chức năng)

#### `ChatModule`
- **Features:** Text messaging, emoji reactions
- **Used by:** Free Talk, Lesson, Teacher Class
- **Events:**
  - `chat:send` - Gửi tin nhắn
  - `chat:message` - Nhận tin nhắn
  - `chat:typing` - Đang gõ

#### `YoutubeSyncModule`
- **Features:** Synchronized video playback
- **Used by:** Teacher Class
- **Events:**
  - `youtube:play` - Phát video
  - `youtube:pause` - Tạm dừng
  - `youtube:seek` - Tua video

#### `WaitingRoomModule`
- **Features:** Host approval before joining
- **Used by:** Lesson, Teacher Class
- **Events:**
  - `waiting-room:admit` - Cho phép vào
  - `waiting-room:deny` - Từ chối

#### `ModerationModule`
- **Features:** Kick, mute, block users
- **Used by:** Lesson, Teacher Class
- **Events:**
  - `admin:kick-user`
  - `admin:mute-user`
  - `admin:block-user`

---

## 🎨 Room Types & Features

### Free Talk Room
```typescript
Features: [AUDIO, VIDEO, CHAT, REACTIONS, HAND_RAISE]
Max Participants: 4
Payment: ❌ No
Enrollment: ❌ No
Time Restricted: ❌ No
Moderation: Basic
```

### Lesson Room
```typescript
Features: [AUDIO, VIDEO, SCREEN_SHARE, CHAT, WHITEBOARD, 
          HAND_RAISE, WAITING_ROOM, MUTE_CONTROL, 
          KICK_USER, RECORDING, ANALYTICS]
Max Participants: 30
Payment: ✅ Yes
Enrollment: ✅ Yes
Time Restricted: ✅ Yes
Moderation: Advanced
```

### Teacher Class Room
```typescript
Features: [AUDIO, VIDEO, SCREEN_SHARE, CHAT, YOUTUBE_SYNC,
          WHITEBOARD, POLLS, HAND_RAISE, REACTIONS,
          WAITING_ROOM, KICK_USER, MUTE_CONTROL,
          BLOCK_USER, ROOM_LOCK, RECORDING]
Max Participants: 50
Payment: ✅ Yes
Enrollment: ❌ No
Time Restricted: ✅ Yes
Moderation: Advanced
```

---

## 💻 Code Examples

### 1. Tạo Room Type Mới

```typescript
// Step 1: Define config
export const WEBINAR_ROOM_CONFIG: RoomConfig = {
  roomType: 'webinar',
  displayName: 'Webinar',
  features: [
    RoomFeature.AUDIO,
    RoomFeature.VIDEO,
    RoomFeature.SCREEN_SHARE,
    RoomFeature.CHAT,
    RoomFeature.POLLS,
    RoomFeature.RECORDING,
  ],
  maxParticipants: 500,
  requiresPayment: true,
  requiresEnrollment: true,
  timeRestricted: true,
  moderationLevel: ModerationLevel.ADVANCED,
};

// Step 2: Implement service
@Injectable()
export class WebinarRoomService extends BaseRoomService {
  async validateAccess(userId: string, roomId: string): Promise<boolean> {
    // Custom validation logic
    return this.accessValidator.validateRoomAccess(userId, roomId, {
      requiresPayment: true,
      requiresEnrollment: true,
      timeRestricted: true,
    });
  }
}

// Step 3: Register in ROOM_CONFIGS
export const ROOM_CONFIGS = {
  // ... existing configs
  webinar: WEBINAR_ROOM_CONFIG,
};
```

---

### 2. Check Feature Availability

```typescript
// In gateway or controller
const roomService = await this.roomFactory.getRoomService(roomType);

if (roomService.hasFeature(RoomFeature.CHAT)) {
  // Handle chat message
  await this.chatService.sendMessage(data);
} else {
  throw new Error('Chat is not available in this room');
}
```

---

### 3. Validate Access

```typescript
const result = await this.accessValidator.validateRoomAccess(
  userId,
  roomId,
  {
    requiresPayment: true,
    requiresEnrollment: true,
    timeRestricted: true,
  }
);

if (!result.allowed) {
  if (result.requiresPayment) {
    return { error: 'Payment required' };
  }
  if (result.requiresEnrollment) {
    return { error: 'Enrollment required' };
  }
  return { error: result.reason };
}
```

---

### 4. Generate Token

```typescript
const roomService = await this.roomFactory.getRoomService(roomType);
const token = await roomService.generateToken(
  userId,
  roomId,
  username,
  isHost
);
```

---

## 🔌 Socket Events Reference

### Core Events (All Rooms)

```typescript
// Join/Leave
'room:join' -> { roomId, roomType, userId }
'room:joined' -> { token, roomInfo }
'room:leave' -> { roomId }
'room:user-joined' -> { userId, username }
'room:user-left' -> { userId }

// Media Controls
'media:toggle-mic' -> { isMuted }
'media:toggle-video' -> { isVideoOff }
'media:screen-share' -> { isSharing }
```

### Feature-Specific Events

```typescript
// Chat (if enabled)
'chat:send' -> { message, replyTo? }
'chat:message' -> { id, message, senderId, senderName, timestamp }

// YouTube (if enabled)
'youtube:play' -> { videoId, currentTime }
'youtube:pause' -> { currentTime }
'youtube:seek' -> { currentTime }

// Waiting Room (if enabled)
'waiting-room:admit' -> { participantId }
'waiting-room:deny' -> { participantId, reason? }
'waiting-room:admitted' -> { token }

// Moderation (if enabled)
'admin:kick-user' -> { targetUserId, reason? }
'admin:mute-user' -> { targetUserId, mute }
'admin:block-user' -> { targetUserId, reason? }
```

---

## 🗂️ File Structure

```
src/
├── core/
│   ├── room/
│   │   ├── enums/
│   │   │   ├── room-feature.enum.ts
│   │   │   └── moderation-level.enum.ts
│   │   ├── interfaces/
│   │   │   ├── room-config.interface.ts
│   │   │   └── room-service.interface.ts
│   │   ├── configs/
│   │   │   ├── room-configs.constant.ts
│   │   │   ├── free-talk-room.config.ts
│   │   │   ├── lesson-room.config.ts
│   │   │   └── teacher-class-room.config.ts
│   │   ├── services/
│   │   │   ├── base-room.service.ts
│   │   │   └── room-factory.service.ts
│   │   └── room.module.ts
│   │
│   └── access-control/
│       ├── services/
│       │   ├── access-validator.service.ts
│       │   ├── enrollment-checker.service.ts
│       │   └── time-based-access.service.ts
│       └── access-control.module.ts
│
└── features/
    ├── room-features/
    │   ├── chat/
    │   ├── youtube-sync/
    │   ├── waiting-room/
    │   ├── moderation/
    │   └── ...
    │
    └── room-types/
        ├── free-talk-room/
        ├── lesson-room/
        ├── teacher-class-room/
        └── ...
```

---

## 🧪 Testing Commands

```bash
# Run all tests
npm run test

# Run specific module tests
npm run test -- room.module
npm run test -- access-control.module

# Run with coverage
npm run test:cov

# E2E tests
npm run test:e2e
```

---

## 🚀 Deployment Checklist

### Phase 1 (Foundation)
- [ ] Create core abstractions
- [ ] Create room configs
- [ ] Create access control module
- [ ] Unit tests pass
- [ ] Documentation complete

### Phase 2 (Feature Extraction)
- [ ] Extract chat module
- [ ] Extract youtube sync module
- [ ] Extract waiting room module
- [ ] Extract moderation module
- [ ] Integration tests pass

### Phase 3 (Room Types)
- [ ] Implement FreeTalkRoomService
- [ ] Implement LessonRoomService
- [ ] Implement TeacherClassRoomService
- [ ] E2E tests pass

### Phase 4 (Gateway Refactor)
- [ ] Simplify main gateway
- [ ] Delegate to feature gateways
- [ ] Update frontend
- [ ] Regression tests pass

### Phase 5 (Migration)
- [ ] Migrate existing data
- [ ] Run in parallel mode
- [ ] Switch to new system
- [ ] Remove old code

---

## 📊 Feature Matrix Quick Reference

| Feature | Free Talk | Lesson | Teacher Class |
|---------|-----------|--------|---------------|
| Audio | ✅ | ✅ | ✅ |
| Video | ✅ | ✅ | ✅ |
| Screen Share | ❌ | ✅ | ✅ |
| Chat | ✅ | ✅ | ✅ |
| YouTube Sync | ❌ | ❌ | ✅ |
| Whiteboard | ❌ | ✅ | ✅ |
| Polls | ❌ | ❌ | ✅ |
| Hand Raise | ✅ | ✅ | ✅ |
| Reactions | ✅ | ❌ | ✅ |
| Waiting Room | ❌ | ✅ | ✅ |
| Kick User | ❌ | ✅ | ✅ |
| Mute Control | ❌ | ✅ | ✅ |
| Block User | ❌ | ✅ | ✅ |
| Room Lock | ❌ | ✅ | ✅ |
| Recording | ❌ | ✅ | ✅ |
| Analytics | ❌ | ✅ | ❌ |

---

## 🔧 Common Tasks

### Add New Feature to Existing Room Type

```typescript
// 1. Add feature to enum (if new)
export enum RoomFeature {
  // ...
  NEW_FEATURE = 'new_feature',
}

// 2. Update room config
export const LESSON_ROOM_CONFIG: RoomConfig = {
  // ...
  features: [
    // ... existing features
    RoomFeature.NEW_FEATURE,
  ],
};

// 3. Create feature module
@Module({...})
export class NewFeatureModule {}

// 4. Use in gateway
if (roomService.hasFeature(RoomFeature.NEW_FEATURE)) {
  // Handle feature
}
```

---

### Remove Feature from Room Type

```typescript
// Simply remove from config
export const FREE_TALK_ROOM_CONFIG: RoomConfig = {
  features: [
    RoomFeature.AUDIO,
    RoomFeature.VIDEO,
    // RoomFeature.CHAT, // Removed
  ],
};
```

---

### Change Room Limits

```typescript
export const LESSON_ROOM_CONFIG: RoomConfig = {
  // ...
  maxParticipants: 50, // Changed from 30
};
```

---

## 🐛 Troubleshooting

### Feature Not Working

1. Check if feature is enabled in room config
2. Check if feature module is imported
3. Check if gateway is delegating to feature gateway
4. Check browser console for errors

### Access Denied

1. Check enrollment status
2. Check payment status
3. Check time restrictions
4. Check room capacity

### Token Generation Failed

1. Check LiveKit service is running
2. Check room type is valid
3. Check user permissions

---

## 📚 Resources

- [Full Architecture Doc](./MODULARIZATION_ARCHITECTURE.md)
- [Phase 1 Implementation Guide](./PHASE1_IMPLEMENTATION_GUIDE.md)
- [NestJS Documentation](https://docs.nestjs.com)
- [LiveKit Documentation](https://docs.livekit.io)

---

## 🆘 Getting Help

1. Check this quick reference
2. Read full architecture document
3. Check implementation guide for your phase
4. Ask team for help

---

**Last Updated:** 2025-11-27  
**Version:** 1.0.0
