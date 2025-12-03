# 🏗️ Kiến Trúc Module Hóa Hệ Thống - Modularization Architecture

## 📋 Mục Lục
1. [Tổng Quan Hệ Thống Hiện Tại](#tổng-quan-hệ-thống-hiện-tại)
2. [Phân Tích Các Module Dùng Chung](#phân-tích-các-module-dùng-chung)
3. [Kiến Trúc Module Hóa Đề Xuất](#kiến-trúc-module-hóa-đề-xuất)
4. [Kế Hoạch Triển Khai](#kế-hoạch-triển-khai)
5. [Roadmap Chi Tiết](#roadmap-chi-tiết)

---

## 🔍 Tổng Quan Hệ Thống Hiện Tại

### Cấu Trúc Backend Hiện Tại
```
talkplatform-backend/src/
├── features/
│   ├── meeting/           # ❌ MONOLITHIC - Chứa quá nhiều chức năng
│   ├── courses/           # ✅ Tốt - Tách biệt rõ ràng
│   ├── credits/           # ✅ Tốt - Payment module
│   ├── livekit-rooms/     # ⚠️ Trùng lặp với meeting
│   ├── marketplace/       # ✅ Tốt
│   ├── booking/           # ✅ Tốt
│   ├── wallet/            # ✅ Tốt
│   └── global-chat/       # ✅ Tốt
├── livekit/               # 🔧 Core service
├── auth/                  # 🔧 Core service
└── core/                  # 🔧 Shared utilities
```

### Vấn Đề Hiện Tại

#### 1. **Meeting Module - MONOLITHIC** ❌
**File:** `features/meeting/meetings.gateway.ts` (831 dòng)
- ✅ WebRTC signaling (offer, answer, ICE candidates)
- ✅ Media controls (mic, video, screen share)
- ✅ Chat messaging
- ✅ YouTube sync
- ✅ Hand raising
- ✅ Admin controls (mute, kick, block)
- ✅ Participant management
- ✅ Waiting room logic

**Vấn đề:** Tất cả chức năng đều nằm trong 1 file, khó tái sử dụng cho các loại phòng khác nhau.

#### 2. **Trùng Lặp Code** ⚠️
- `meetings.gateway.ts` và `enhanced-meetings.gateway.ts` có chức năng tương tự
- LiveKit integration nằm rải rác ở nhiều nơi
- Payment/Credits logic được gọi từ nhiều module

#### 3. **Thiếu Tính Linh Hoạt** 🔒
- Không thể tạo phòng với feature set khác nhau
- Mỗi loại phòng cần copy-paste code
- Khó maintain khi có thay đổi

---

## 🧩 Phân Tích Các Module Dùng Chung

### 1. **Payment & Credits** 💰
**Sử dụng bởi:**
- ✅ Course enrollment
- ✅ Lesson purchases
- ✅ Meeting creation (paid rooms)
- ✅ Marketplace transactions
- ⚠️ Booking system

**Chức năng:**
- Deduct credits
- Add credits
- Transaction history
- Payment holds
- Refunds

**Trạng thái:** ✅ ĐÃ MODULE HÓA TỐT
**Location:** `features/credits/`

---

### 2. **Room Join Logic** 🚪
**Sử dụng bởi:**
- Meeting rooms (public, private, scheduled)
- Lesson rooms
- Free talk rooms
- Teacher classes

**Chức năng:**
- Access validation
- Enrollment check
- Time-based access
- Waiting room
- LiveKit token generation

**Trạng thái:** ⚠️ CẦN REFACTOR
**Hiện tại:** Nằm rải rác trong `meetings.service.ts`, `livekit-rooms.service.ts`

---

### 3. **Meeting Room Features** 🎥
**Các chức năng trong phòng:**

#### A. **Core Media Features** (Bắt buộc cho mọi phòng)
- ✅ Audio/Video controls
- ✅ Screen sharing
- ✅ Participant list
- ✅ Join/Leave handling

#### B. **Interactive Features** (Tùy chọn)
- 💬 Chat messaging
- 🎬 YouTube sync
- ✋ Hand raising
- 😊 Reactions/Emojis
- 📊 Polls
- 🎨 Whiteboard

#### C. **Moderation Features** (Chỉ cho host)
- 🔇 Mute participants
- 📹 Force video off
- 🚫 Kick/Block users
- 🔒 Lock room
- ⏸️ Stop screen share
- 👥 Waiting room management

#### D. **Recording & Analytics** (Premium)
- 📹 Recording
- 📊 Analytics
- 📈 Engagement metrics

**Trạng thái:** ❌ TẤT CẢ NẰM TRONG 1 FILE
**Cần:** Tách thành các module độc lập

---

### 4. **LiveKit Integration** 🎙️
**Sử dụng bởi:**
- Tất cả các loại meeting rooms
- Green room (pre-meeting)
- Recording service

**Chức năng:**
- Token generation (host, participant, waiting room)
- Room management
- Track management
- Webhook handling

**Trạng thái:** ✅ ĐÃ MODULE HÓA
**Location:** `livekit/`

---

## 🏛️ Kiến Trúc Module Hóa Đề Xuất

### Nguyên Tắc Thiết Kế

1. **Single Responsibility Principle**: Mỗi module chỉ làm 1 việc
2. **Dependency Injection**: Dễ dàng swap/mock modules
3. **Feature Flags**: Bật/tắt features theo room type
4. **Composition over Inheritance**: Kết hợp modules thay vì kế thừa

---

### Cấu Trúc Mới

```
talkplatform-backend/src/
├── core/
│   ├── room/                          # 🆕 Core room logic
│   │   ├── base-room.service.ts       # Abstract base class
│   │   ├── room-factory.service.ts    # Factory pattern
│   │   └── room-config.interface.ts   # Room configuration
│   │
│   ├── access-control/                # 🆕 Access management
│   │   ├── access-validator.service.ts
│   │   ├── enrollment-checker.service.ts
│   │   └── time-based-access.service.ts
│   │
│   └── payment/                       # ✅ Existing
│       └── credits/
│
├── features/
│   ├── room-features/                 # 🆕 Modular room features
│   │   ├── media/
│   │   │   ├── audio-control.module.ts
│   │   │   ├── video-control.module.ts
│   │   │   ├── screen-share.module.ts
│   │   │   └── media-manager.service.ts
│   │   │
│   │   ├── chat/
│   │   │   ├── chat.module.ts
│   │   │   ├── chat.gateway.ts
│   │   │   ├── chat.service.ts
│   │   │   └── chat-message.entity.ts
│   │   │
│   │   ├── youtube-sync/
│   │   │   ├── youtube-sync.module.ts
│   │   │   ├── youtube-sync.gateway.ts
│   │   │   └── youtube-sync.service.ts
│   │   │
│   │   ├── reactions/
│   │   │   ├── reactions.module.ts
│   │   │   ├── reactions.gateway.ts
│   │   │   └── reactions.service.ts
│   │   │
│   │   ├── hand-raise/
│   │   │   ├── hand-raise.module.ts
│   │   │   ├── hand-raise.gateway.ts
│   │   │   └── hand-raise.service.ts
│   │   │
│   │   ├── whiteboard/
│   │   │   ├── whiteboard.module.ts
│   │   │   ├── whiteboard.gateway.ts
│   │   │   └── whiteboard.service.ts
│   │   │
│   │   ├── polls/
│   │   │   ├── polls.module.ts
│   │   │   ├── polls.gateway.ts
│   │   │   └── polls.service.ts
│   │   │
│   │   ├── moderation/
│   │   │   ├── moderation.module.ts
│   │   │   ├── kick-user.service.ts
│   │   │   ├── mute-control.service.ts
│   │   │   ├── block-user.service.ts
│   │   │   └── room-lock.service.ts
│   │   │
│   │   ├── waiting-room/
│   │   │   ├── waiting-room.module.ts
│   │   │   ├── waiting-room.gateway.ts
│   │   │   └── waiting-room.service.ts  # ✅ Already exists
│   │   │
│   │   ├── recording/
│   │   │   ├── recording.module.ts
│   │   │   ├── recording.service.ts
│   │   │   └── recording-storage.service.ts
│   │   │
│   │   └── analytics/
│   │       ├── analytics.module.ts
│   │       ├── engagement-tracker.service.ts
│   │       └── metrics-collector.service.ts
│   │
│   ├── room-types/                    # 🆕 Specific room implementations
│   │   ├── free-talk-room/
│   │   │   ├── free-talk-room.module.ts
│   │   │   ├── free-talk-room.service.ts
│   │   │   ├── free-talk-room.controller.ts
│   │   │   └── free-talk-room.config.ts
│   │   │
│   │   ├── lesson-room/
│   │   │   ├── lesson-room.module.ts
│   │   │   ├── lesson-room.service.ts
│   │   │   ├── lesson-room.controller.ts
│   │   │   └── lesson-room.config.ts
│   │   │
│   │   ├── teacher-class-room/
│   │   │   ├── teacher-class-room.module.ts
│   │   │   ├── teacher-class-room.service.ts
│   │   │   ├── teacher-class-room.controller.ts
│   │   │   └── teacher-class-room.config.ts
│   │   │
│   │   ├── webinar-room/              # 🆕 Future
│   │   │   └── ...
│   │   │
│   │   └── interview-room/            # 🆕 Future
│   │       └── ...
│   │
│   └── meeting/                       # ♻️ Refactored
│       ├── meeting.module.ts          # Orchestrator module
│       ├── meeting.gateway.ts         # Simplified gateway
│       ├── meeting.service.ts         # Simplified service
│       └── entities/                  # Keep existing entities
│
└── livekit/                           # ✅ Existing
    └── livekit.service.ts
```

---

## 📐 Room Configuration System

### Room Type Definitions

```typescript
// core/room/room-config.interface.ts

export enum RoomFeature {
  // Core (always enabled)
  AUDIO = 'audio',
  VIDEO = 'video',
  SCREEN_SHARE = 'screen_share',
  PARTICIPANT_LIST = 'participant_list',
  
  // Interactive
  CHAT = 'chat',
  YOUTUBE_SYNC = 'youtube_sync',
  HAND_RAISE = 'hand_raise',
  REACTIONS = 'reactions',
  POLLS = 'polls',
  WHITEBOARD = 'whiteboard',
  
  // Moderation
  WAITING_ROOM = 'waiting_room',
  KICK_USER = 'kick_user',
  MUTE_CONTROL = 'mute_control',
  BLOCK_USER = 'block_user',
  ROOM_LOCK = 'room_lock',
  
  // Premium
  RECORDING = 'recording',
  ANALYTICS = 'analytics',
}

export interface RoomConfig {
  roomType: string;
  features: RoomFeature[];
  maxParticipants: number;
  requiresPayment: boolean;
  requiresEnrollment: boolean;
  timeRestricted: boolean;
  moderationLevel: 'none' | 'basic' | 'advanced';
}

// Example configurations
export const ROOM_CONFIGS: Record<string, RoomConfig> = {
  FREE_TALK: {
    roomType: 'free_talk',
    features: [
      RoomFeature.AUDIO,
      RoomFeature.VIDEO,
      RoomFeature.CHAT,
      RoomFeature.REACTIONS,
      RoomFeature.HAND_RAISE,
    ],
    maxParticipants: 4,
    requiresPayment: false,
    requiresEnrollment: false,
    timeRestricted: false,
    moderationLevel: 'basic',
  },
  
  LESSON: {
    roomType: 'lesson',
    features: [
      RoomFeature.AUDIO,
      RoomFeature.VIDEO,
      RoomFeature.SCREEN_SHARE,
      RoomFeature.CHAT,
      RoomFeature.WHITEBOARD,
      RoomFeature.HAND_RAISE,
      RoomFeature.WAITING_ROOM,
      RoomFeature.RECORDING,
      RoomFeature.ANALYTICS,
    ],
    maxParticipants: 30,
    requiresPayment: true,
    requiresEnrollment: true,
    timeRestricted: true,
    moderationLevel: 'advanced',
  },
  
  TEACHER_CLASS: {
    roomType: 'teacher_class',
    features: [
      RoomFeature.AUDIO,
      RoomFeature.VIDEO,
      RoomFeature.SCREEN_SHARE,
      RoomFeature.CHAT,
      RoomFeature.YOUTUBE_SYNC,
      RoomFeature.WHITEBOARD,
      RoomFeature.POLLS,
      RoomFeature.HAND_RAISE,
      RoomFeature.WAITING_ROOM,
      RoomFeature.KICK_USER,
      RoomFeature.MUTE_CONTROL,
      RoomFeature.BLOCK_USER,
      RoomFeature.ROOM_LOCK,
      RoomFeature.RECORDING,
    ],
    maxParticipants: 50,
    requiresPayment: true,
    requiresEnrollment: false,
    timeRestricted: true,
    moderationLevel: 'advanced',
  },
  
  WEBINAR: {
    roomType: 'webinar',
    features: [
      RoomFeature.AUDIO,
      RoomFeature.VIDEO,
      RoomFeature.SCREEN_SHARE,
      RoomFeature.CHAT,
      RoomFeature.POLLS,
      RoomFeature.HAND_RAISE,
      RoomFeature.WAITING_ROOM,
      RoomFeature.RECORDING,
      RoomFeature.ANALYTICS,
    ],
    maxParticipants: 500,
    requiresPayment: true,
    requiresEnrollment: true,
    timeRestricted: true,
    moderationLevel: 'advanced',
  },
};
```

---

## 🔧 Implementation Examples

### 1. Base Room Service

```typescript
// core/room/base-room.service.ts

@Injectable()
export abstract class BaseRoomService {
  constructor(
    protected readonly roomConfig: RoomConfig,
    protected readonly livekitService: LiveKitService,
    protected readonly accessValidator: AccessValidatorService,
  ) {}

  abstract validateAccess(userId: string, roomId: string): Promise<boolean>;
  abstract onUserJoin(userId: string, roomId: string): Promise<void>;
  abstract onUserLeave(userId: string, roomId: string): Promise<void>;

  hasFeature(feature: RoomFeature): boolean {
    return this.roomConfig.features.includes(feature);
  }

  async generateToken(userId: string, roomId: string, isHost: boolean): Promise<string> {
    if (isHost) {
      return this.livekitService.generateHostToken(roomId, userId, username, metadata);
    }
    return this.livekitService.generateParticipantToken(roomId, userId, username, metadata);
  }
}
```

### 2. Feature Module Example - Chat

```typescript
// features/room-features/chat/chat.module.ts

@Module({
  imports: [
    TypeOrmModule.forFeature([ChatMessage]),
  ],
  providers: [ChatService, ChatGateway],
  exports: [ChatService],
})
export class ChatModule {}

// features/room-features/chat/chat.gateway.ts

@WebSocketGateway({ namespace: '/chat' })
export class ChatGateway {
  @SubscribeMessage('chat:send')
  async handleSendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string; message: string },
  ) {
    // Only handle chat logic
    const savedMessage = await this.chatService.saveMessage(data);
    this.server.to(data.roomId).emit('chat:message', savedMessage);
  }
}
```

### 3. Room Type Implementation - Lesson Room

```typescript
// features/room-types/lesson-room/lesson-room.service.ts

@Injectable()
export class LessonRoomService extends BaseRoomService {
  constructor(
    @Inject(LESSON_ROOM_CONFIG) config: RoomConfig,
    livekitService: LiveKitService,
    accessValidator: AccessValidatorService,
    private readonly enrollmentService: EnrollmentService,
  ) {
    super(config, livekitService, accessValidator);
  }

  async validateAccess(userId: string, roomId: string): Promise<boolean> {
    // Check enrollment
    const hasEnrollment = await this.enrollmentService.checkEnrollment(userId, roomId);
    if (!hasEnrollment) return false;

    // Check time restriction
    if (this.roomConfig.timeRestricted) {
      return this.accessValidator.validateTimeAccess(roomId);
    }

    return true;
  }

  async onUserJoin(userId: string, roomId: string): Promise<void> {
    // Lesson-specific join logic
    await this.trackAttendance(userId, roomId);
  }

  async onUserLeave(userId: string, roomId: string): Promise<void> {
    // Lesson-specific leave logic
    await this.updateAttendanceDuration(userId, roomId);
  }
}

// features/room-types/lesson-room/lesson-room.config.ts

export const LESSON_ROOM_CONFIG: RoomConfig = {
  roomType: 'lesson',
  features: [
    RoomFeature.AUDIO,
    RoomFeature.VIDEO,
    RoomFeature.SCREEN_SHARE,
    RoomFeature.CHAT,
    RoomFeature.WHITEBOARD,
    RoomFeature.HAND_RAISE,
    RoomFeature.WAITING_ROOM,
    RoomFeature.RECORDING,
  ],
  maxParticipants: 30,
  requiresPayment: true,
  requiresEnrollment: true,
  timeRestricted: true,
  moderationLevel: 'advanced',
};
```

### 4. Room Factory

```typescript
// core/room/room-factory.service.ts

@Injectable()
export class RoomFactoryService {
  constructor(
    private readonly moduleRef: ModuleRef,
  ) {}

  async createRoom(roomType: string): Promise<BaseRoomService> {
    switch (roomType) {
      case 'free_talk':
        return this.moduleRef.get(FreeTalkRoomService);
      case 'lesson':
        return this.moduleRef.get(LessonRoomService);
      case 'teacher_class':
        return this.moduleRef.get(TeacherClassRoomService);
      case 'webinar':
        return this.moduleRef.get(WebinarRoomService);
      default:
        throw new Error(`Unknown room type: ${roomType}`);
    }
  }
}
```

### 5. Unified Gateway

```typescript
// features/meeting/meeting.gateway.ts (Simplified)

@WebSocketGateway()
export class MeetingGateway {
  constructor(
    private readonly roomFactory: RoomFactoryService,
    private readonly chatGateway: ChatGateway,
    private readonly youtubeGateway: YoutubeSyncGateway,
    private readonly moderationService: ModerationService,
  ) {}

  @SubscribeMessage('room:join')
  async handleJoinRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string; roomType: string },
  ) {
    // Get room service
    const roomService = await this.roomFactory.createRoom(data.roomType);
    
    // Validate access
    const hasAccess = await roomService.validateAccess(client.userId, data.roomId);
    if (!hasAccess) {
      client.emit('error', { message: 'Access denied' });
      return;
    }

    // Join room
    await roomService.onUserJoin(client.userId, data.roomId);
    client.join(data.roomId);

    // Generate token
    const token = await roomService.generateToken(client.userId, data.roomId, false);
    
    client.emit('room:joined', { token });
  }

  @SubscribeMessage('chat:send')
  async handleChat(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: any,
  ) {
    // Get room config
    const room = await this.getRoomConfig(data.roomId);
    
    // Check if chat is enabled
    if (!room.hasFeature(RoomFeature.CHAT)) {
      client.emit('error', { message: 'Chat is disabled in this room' });
      return;
    }

    // Delegate to chat gateway
    return this.chatGateway.handleSendMessage(client, data);
  }
}
```

---

## 📊 Feature Matrix

| Feature | Free Talk | Lesson | Teacher Class | Webinar | Interview |
|---------|-----------|--------|---------------|---------|-----------|
| **Core** |
| Audio | ✅ | ✅ | ✅ | ✅ | ✅ |
| Video | ✅ | ✅ | ✅ | ✅ | ✅ |
| Screen Share | ❌ | ✅ | ✅ | ✅ | ✅ |
| Participant List | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Interactive** |
| Chat | ✅ | ✅ | ✅ | ✅ | ❌ |
| YouTube Sync | ❌ | ❌ | ✅ | ❌ | ❌ |
| Hand Raise | ✅ | ✅ | ✅ | ✅ | ❌ |
| Reactions | ✅ | ❌ | ✅ | ✅ | ❌ |
| Polls | ❌ | ❌ | ✅ | ✅ | ❌ |
| Whiteboard | ❌ | ✅ | ✅ | ❌ | ✅ |
| **Moderation** |
| Waiting Room | ❌ | ✅ | ✅ | ✅ | ✅ |
| Kick User | ❌ | ✅ | ✅ | ✅ | ❌ |
| Mute Control | ❌ | ✅ | ✅ | ✅ | ❌ |
| Block User | ❌ | ✅ | ✅ | ✅ | ❌ |
| Room Lock | ❌ | ✅ | ✅ | ✅ | ✅ |
| **Premium** |
| Recording | ❌ | ✅ | ✅ | ✅ | ✅ |
| Analytics | ❌ | ✅ | ❌ | ✅ | ❌ |
| **Access Control** |
| Payment Required | ❌ | ✅ | ✅ | ✅ | ❌ |
| Enrollment Required | ❌ | ✅ | ❌ | ✅ | ❌ |
| Time Restricted | ❌ | ✅ | ✅ | ✅ | ✅ |
| **Limits** |
| Max Participants | 4 | 30 | 50 | 500 | 2 |

---

## 🚀 Kế Hoạch Triển Khai

### Phase 1: Foundation (Week 1-2) 🏗️

#### 1.1 Create Core Abstractions
- [ ] `BaseRoomService` abstract class
- [ ] `RoomConfig` interface
- [ ] `RoomFeature` enum
- [ ] `RoomFactoryService`
- [ ] `AccessValidatorService`

#### 1.2 Extract Shared Services
- [ ] Move `WaitingRoomService` to `room-features/waiting-room/`
- [ ] Create `AccessControlModule`
- [ ] Create `PaymentIntegrationModule`

**Deliverable:** Core abstractions ready for use

---

### Phase 2: Feature Extraction (Week 3-4) 🧩

#### 2.1 Extract Media Features
- [ ] `AudioControlModule`
- [ ] `VideoControlModule`
- [ ] `ScreenShareModule`
- [ ] `MediaManagerService`

#### 2.2 Extract Interactive Features
- [ ] `ChatModule` (from existing chat logic)
- [ ] `YoutubeSyncModule`
- [ ] `HandRaiseModule`
- [ ] `ReactionsModule`

#### 2.3 Extract Moderation Features
- [ ] `ModerationModule`
  - [ ] `KickUserService`
  - [ ] `MuteControlService`
  - [ ] `BlockUserService`
  - [ ] `RoomLockService`

**Deliverable:** All features as independent modules

---

### Phase 3: Room Type Implementation (Week 5-6) 🏠

#### 3.1 Implement Room Types
- [ ] `FreeTalkRoomModule`
- [ ] `LessonRoomModule`
- [ ] `TeacherClassRoomModule`

#### 3.2 Create Room Configurations
- [ ] Define feature sets for each room type
- [ ] Configure access control rules
- [ ] Set participant limits

**Deliverable:** 3 room types fully functional

---

### Phase 4: Gateway Refactoring (Week 7) 🔌

#### 4.1 Simplify Main Gateway
- [ ] Remove feature-specific logic
- [ ] Delegate to feature gateways
- [ ] Implement feature checking

#### 4.2 Update Frontend Integration
- [ ] Update API calls
- [ ] Handle new event structure
- [ ] Test all room types

**Deliverable:** Unified gateway with feature delegation

---

### Phase 5: Migration & Testing (Week 8) 🧪

#### 5.1 Data Migration
- [ ] Migrate existing meetings to new structure
- [ ] Update database schema if needed
- [ ] Preserve existing functionality

#### 5.2 Testing
- [ ] Unit tests for each module
- [ ] Integration tests for room types
- [ ] E2E tests for user flows

#### 5.3 Deprecation
- [ ] Mark old code as deprecated
- [ ] Remove after migration complete

**Deliverable:** Fully migrated system

---

### Phase 6: Advanced Features (Week 9-10) 🌟

#### 6.1 New Features
- [ ] `WhiteboardModule`
- [ ] `PollsModule`
- [ ] `RecordingModule`
- [ ] `AnalyticsModule`

#### 6.2 New Room Types
- [ ] `WebinarRoomModule`
- [ ] `InterviewRoomModule`

**Deliverable:** Advanced features and new room types

---

## 📝 Migration Checklist

### Backend Migration

- [ ] Create new module structure
- [ ] Extract feature modules
- [ ] Implement room types
- [ ] Refactor gateway
- [ ] Update controllers
- [ ] Migrate database
- [ ] Update tests
- [ ] Deploy to staging
- [ ] Deploy to production

### Frontend Migration

- [ ] Update API client
- [ ] Update socket event handlers
- [ ] Update UI components
- [ ] Add feature flags
- [ ] Test all room types
- [ ] Deploy to staging
- [ ] Deploy to production

---

## 🎯 Benefits

### 1. **Reusability** ♻️
- Mỗi feature là một module độc lập
- Dễ dàng kết hợp features cho room types mới
- Không cần copy-paste code

### 2. **Maintainability** 🔧
- Mỗi module nhỏ, dễ hiểu
- Thay đổi một feature không ảnh hưởng features khác
- Dễ dàng debug và test

### 3. **Scalability** 📈
- Thêm room type mới chỉ cần config
- Thêm feature mới không ảnh hưởng code cũ
- Dễ dàng mở rộng hệ thống

### 4. **Flexibility** 🎨
- Bật/tắt features theo room type
- Customize behavior cho từng room
- A/B testing features

### 5. **Testing** ✅
- Test từng module độc lập
- Mock dependencies dễ dàng
- Coverage cao hơn

---

## ⚠️ Risks & Mitigation

### Risk 1: Breaking Changes
**Mitigation:**
- Implement feature flags
- Run old and new code in parallel
- Gradual migration

### Risk 2: Performance Overhead
**Mitigation:**
- Lazy loading modules
- Cache room configurations
- Optimize database queries

### Risk 3: Complexity
**Mitigation:**
- Clear documentation
- Code examples
- Training for team

---

## 📚 Documentation Requirements

### 1. Architecture Docs
- [ ] Module structure diagram
- [ ] Feature interaction diagram
- [ ] Data flow diagram

### 2. Developer Guides
- [ ] How to create a new room type
- [ ] How to add a new feature
- [ ] How to configure room features

### 3. API Documentation
- [ ] Socket events for each feature
- [ ] REST endpoints
- [ ] Authentication flow

---

## 🎓 Example: Creating a New Room Type

```typescript
// Step 1: Define configuration
export const INTERVIEW_ROOM_CONFIG: RoomConfig = {
  roomType: 'interview',
  features: [
    RoomFeature.AUDIO,
    RoomFeature.VIDEO,
    RoomFeature.SCREEN_SHARE,
    RoomFeature.WHITEBOARD,
    RoomFeature.RECORDING,
  ],
  maxParticipants: 2,
  requiresPayment: false,
  requiresEnrollment: false,
  timeRestricted: true,
  moderationLevel: 'none',
};

// Step 2: Implement service
@Injectable()
export class InterviewRoomService extends BaseRoomService {
  async validateAccess(userId: string, roomId: string): Promise<boolean> {
    // Interview-specific validation
    return this.accessValidator.validateInterviewAccess(userId, roomId);
  }
}

// Step 3: Create module
@Module({
  imports: [
    // Import only needed feature modules
    AudioControlModule,
    VideoControlModule,
    ScreenShareModule,
    WhiteboardModule,
    RecordingModule,
  ],
  providers: [
    InterviewRoomService,
    { provide: ROOM_CONFIG, useValue: INTERVIEW_ROOM_CONFIG },
  ],
  exports: [InterviewRoomService],
})
export class InterviewRoomModule {}

// Step 4: Register in factory
// Done! No need to modify gateway or other code
```

---

## ✅ Success Criteria

1. ✅ Mỗi feature là một module độc lập
2. ✅ Có thể tạo room type mới chỉ bằng configuration
3. ✅ Không có code duplication
4. ✅ Test coverage > 80%
5. ✅ Performance không giảm
6. ✅ Backward compatible với existing rooms
7. ✅ Documentation đầy đủ

---

## 📞 Next Steps

1. **Review this document** với team
2. **Approve architecture** và timeline
3. **Start Phase 1** - Create core abstractions
4. **Weekly sync** để track progress

---

**Created:** 2025-11-27  
**Author:** AI Assistant  
**Status:** 📋 Proposal - Awaiting Approval
