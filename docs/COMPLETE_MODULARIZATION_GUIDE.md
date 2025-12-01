# 🏗️ COMPLETE SYSTEM MODULARIZATION - Tài Liệu Module Hóa Toàn Diện

## 📋 Mục Lục
1. [Tổng Quan Hệ Thống](#tổng-quan-hệ-thống)
2. [Kiến Trúc Module Hóa Tổng Thể](#kiến-trúc-module-hóa-tổng-thể)
3. [Chi Tiết Từng Module](#chi-tiết-từng-module)
4. [Dependency Graph](#dependency-graph)
5. [Implementation Roadmap](#implementation-roadmap)

---

## 🎯 Tổng Quan Hệ Thống

### Phân Tích Hệ Thống Hiện Tại

```
📊 THỐNG KÊ CODE BASE:
├── Backend Services: 10 feature modules
├── Total Lines: ~3,000+ lines (chỉ riêng MeetingsService + CoursesService)
├── Monolithic Files: 
│   ├── meetings.service.ts: 891 lines
│   ├── courses.service.ts: 1,056 lines
│   └── meetings.gateway.ts: 831 lines
└── Complexity: HIGH ❌
```

### Các Module Chính Hiện Tại

| Module | Chức Năng | Trạng Thái | Số Lượng Files |
|--------|-----------|------------|----------------|
| **meeting** | Meeting rooms, WebRTC, Chat | ❌ Monolithic | 25 |
| **courses** | Course management, Lessons | ⚠️ Large | 20 |
| **credits** | Payment, Transactions | ✅ Good | 6 |
| **marketplace** | Teacher materials | ✅ Good | 14 |
| **teachers** | Teacher verification | ✅ Good | 16 |
| **booking** | Booking slots | ✅ Good | 7 |
| **wallet** | Wallet management | ✅ Good | 5 |
| **global-chat** | Global chat | ✅ Good | 6 |
| **livekit-rooms** | LiveKit integration | ⚠️ Overlap | 4 |
| **schedules** | Scheduling | ✅ Good | 2 |

---

## 🏛️ Kiến Trúc Module Hóa Tổng Thể

### Layer Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     PRESENTATION LAYER                       │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │Controllers│  │ Gateways │  │   DTOs   │  │ Validators│   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                     BUSINESS LOGIC LAYER                     │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              DOMAIN SERVICES                          │  │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐ │  │
│  │  │ Meeting │  │ Course  │  │ Payment │  │ Booking │ │  │
│  │  │ Service │  │ Service │  │ Service │  │ Service │ │  │
│  │  └─────────┘  └─────────┘  └─────────┘  └─────────┘ │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              FEATURE MODULES                          │  │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐ │  │
│  │  │  Chat   │  │ YouTube │  │ Waiting │  │  Hand   │ │  │
│  │  │ Module  │  │  Sync   │  │  Room   │  │  Raise  │ │  │
│  │  └─────────┘  └─────────┘  └─────────┘  └─────────┘ │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                     CORE/SHARED LAYER                        │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐ │  │
│  │  │  Room   │  │ Access  │  │ Payment │  │ Storage │ │  │
│  │  │ Factory │  │ Control │  │  Core   │  │  Core   │ │  │
│  │  └─────────┘  └─────────┘  └─────────┘  └─────────┘ │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                     DATA ACCESS LAYER                        │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │Repositories│  │ Entities │  │  TypeORM │  │  Redis   │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                     INFRASTRUCTURE LAYER                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │ Database │  │ LiveKit  │  │  Socket  │  │  Queue   │   │
│  │  MySQL   │  │   SFU    │  │   IO     │  │  Bull    │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

## 📦 Chi Tiết Từng Module

### 1. CORE MODULES (Nền Tảng)

#### 1.1 Room Core Module

**Location:** `src/core/room/`

**Purpose:** Quản lý tất cả logic liên quan đến phòng họp

**Structure:**
```
src/core/room/
├── interfaces/
│   ├── room-config.interface.ts
│   ├── room-service.interface.ts
│   ├── room-feature.interface.ts
│   └── room-state.interface.ts
├── enums/
│   ├── room-feature.enum.ts
│   ├── room-type.enum.ts
│   ├── moderation-level.enum.ts
│   └── room-status.enum.ts
├── configs/
│   ├── room-configs.constant.ts
│   ├── free-talk-room.config.ts
│   ├── lesson-room.config.ts
│   ├── teacher-class-room.config.ts
│   ├── webinar-room.config.ts
│   └── interview-room.config.ts
├── services/
│   ├── base-room.service.ts
│   ├── room-factory.service.ts
│   ├── room-state-manager.service.ts (Redis)
│   └── room-lifecycle.service.ts
├── decorators/
│   ├── room-feature.decorator.ts
│   └── require-room-permission.decorator.ts
├── guards/
│   ├── room-access.guard.ts
│   └── room-feature.guard.ts
├── room.module.ts
└── index.ts
```

**Key Features:**
- ✅ Room configuration management
- ✅ Room factory pattern
- ✅ Room state management (Redis)
- ✅ Room lifecycle hooks
- ✅ Feature-based access control

**Interfaces:**

```typescript
// room-config.interface.ts
export interface RoomConfig {
  roomType: RoomType;
  displayName: string;
  description: string;
  features: RoomFeature[];
  maxParticipants: number;
  requiresPayment: boolean;
  requiresEnrollment: boolean;
  timeRestricted: boolean;
  moderationLevel: ModerationLevel;
  defaultSettings: RoomDefaultSettings;
  accessControl: RoomAccessControl;
  livekitSettings: LiveKitSettings;
  stateManagement: StateManagementConfig;
}

// room-state.interface.ts
export interface RoomState {
  roomId: string;
  roomType: RoomType;
  status: RoomStatus;
  hostId: string;
  participants: Map<string, ParticipantState>;
  features: Map<RoomFeature, FeatureState>;
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface ParticipantState {
  userId: string;
  username: string;
  role: ParticipantRole;
  isOnline: boolean;
  isMuted: boolean;
  isVideoOff: boolean;
  isHandRaised: boolean;
  isScreenSharing: boolean;
  joinedAt: Date;
  lastActivity: Date;
}

export interface FeatureState {
  feature: RoomFeature;
  enabled: boolean;
  config: Record<string, any>;
  state: Record<string, any>;
}
```

---

#### 1.2 Access Control Module

**Location:** `src/core/access-control/`

**Purpose:** Quản lý tất cả logic kiểm soát truy cập

**Structure:**
```
src/core/access-control/
├── interfaces/
│   ├── access-validator.interface.ts
│   ├── access-rule.interface.ts
│   └── permission.interface.ts
├── enums/
│   ├── permission.enum.ts
│   └── access-level.enum.ts
├── services/
│   ├── access-validator.service.ts
│   ├── enrollment-checker.service.ts
│   ├── time-based-access.service.ts
│   ├── payment-checker.service.ts
│   ├── role-based-access.service.ts
│   └── capacity-checker.service.ts
├── guards/
│   ├── enrollment.guard.ts
│   ├── payment.guard.ts
│   ├── time-restriction.guard.ts
│   └── capacity.guard.ts
├── decorators/
│   ├── require-enrollment.decorator.ts
│   ├── require-payment.decorator.ts
│   └── require-permission.decorator.ts
├── access-control.module.ts
└── index.ts
```

**Key Features:**
- ✅ Enrollment validation
- ✅ Payment validation
- ✅ Time-based access
- ✅ Role-based access control (RBAC)
- ✅ Capacity management

**Services:**

```typescript
// access-validator.service.ts
@Injectable()
export class AccessValidatorService {
  async validateRoomAccess(
    userId: string,
    roomId: string,
    roomConfig: RoomConfig,
  ): Promise<AccessValidationResult> {
    const checks = [];

    // Enrollment check
    if (roomConfig.requiresEnrollment) {
      checks.push(this.enrollmentChecker.check(userId, roomId));
    }

    // Payment check
    if (roomConfig.requiresPayment) {
      checks.push(this.paymentChecker.check(userId, roomId));
    }

    // Time restriction check
    if (roomConfig.timeRestricted) {
      checks.push(this.timeBasedAccess.check(roomId));
    }

    // Capacity check
    checks.push(this.capacityChecker.check(roomId, roomConfig.maxParticipants));

    const results = await Promise.all(checks);
    return this.aggregateResults(results);
  }
}
```

---

#### 1.3 Payment Core Module

**Location:** `src/core/payment/`

**Purpose:** Quản lý tất cả logic thanh toán và credits

**Structure:**
```
src/core/payment/
├── interfaces/
│   ├── payment-provider.interface.ts
│   ├── transaction.interface.ts
│   └── payment-method.interface.ts
├── enums/
│   ├── payment-status.enum.ts
│   ├── transaction-type.enum.ts
│   └── currency.enum.ts
├── services/
│   ├── payment-orchestrator.service.ts
│   ├── credit-manager.service.ts
│   ├── transaction-manager.service.ts
│   ├── refund-manager.service.ts
│   └── payment-hold.service.ts
├── providers/
│   ├── stripe-provider.service.ts
│   ├── paypal-provider.service.ts
│   └── vnpay-provider.service.ts
├── guards/
│   ├── has-credits.guard.ts
│   └── payment-verified.guard.ts
├── payment.module.ts
└── index.ts
```

**Key Features:**
- ✅ Multi-provider support
- ✅ Credit management
- ✅ Transaction tracking
- ✅ Refund handling
- ✅ Payment holds

---

#### 1.4 Storage Core Module

**Location:** `src/core/storage/`

**Purpose:** Quản lý file storage (local & cloud)

**Structure:**
```
src/core/storage/
├── interfaces/
│   ├── storage-provider.interface.ts
│   └── file-metadata.interface.ts
├── enums/
│   ├── storage-type.enum.ts
│   └── file-type.enum.ts
├── services/
│   ├── storage-orchestrator.service.ts
│   ├── local-storage.service.ts
│   ├── s3-storage.service.ts
│   └── file-validator.service.ts
├── storage.module.ts
└── index.ts
```

---

### 2. FEATURE MODULES (Chức Năng)

#### 2.1 Room Features (Chức Năng Phòng Họp)

##### 2.1.1 Chat Module

**Location:** `src/features/room-features/chat/`

**Structure:**
```
src/features/room-features/chat/
├── interfaces/
│   ├── chat-message.interface.ts
│   └── chat-config.interface.ts
├── enums/
│   ├── message-type.enum.ts
│   └── chat-permission.enum.ts
├── entities/
│   ├── chat-message.entity.ts
│   └── chat-reaction.entity.ts
├── dto/
│   ├── send-message.dto.ts
│   ├── edit-message.dto.ts
│   └── delete-message.dto.ts
├── services/
│   ├── chat.service.ts
│   ├── chat-moderation.service.ts
│   └── chat-history.service.ts
├── gateways/
│   └── chat.gateway.ts
├── guards/
│   └── chat-permission.guard.ts
├── chat.module.ts
└── index.ts
```

**Features:**
- ✅ Text messaging
- ✅ Emoji reactions
- ✅ Reply to messages
- ✅ Edit/Delete messages
- ✅ Message moderation
- ✅ Chat history
- ✅ Private messages (DM)
- ✅ File sharing in chat

**Gateway Events:**
```typescript
@WebSocketGateway({ namespace: '/chat' })
export class ChatGateway {
  @SubscribeMessage('chat:send')
  async handleSendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() dto: SendMessageDto,
  ) {
    // Validate room feature
    if (!this.roomService.hasFeature(dto.roomId, RoomFeature.CHAT)) {
      throw new WsException('Chat is disabled in this room');
    }

    // Save message
    const message = await this.chatService.sendMessage(dto);

    // Broadcast to room
    this.server.to(dto.roomId).emit('chat:message', message);
  }

  @SubscribeMessage('chat:typing')
  async handleTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string; isTyping: boolean },
  ) {
    // Broadcast typing indicator
    client.to(data.roomId).emit('chat:user-typing', {
      userId: client.userId,
      username: client.username,
      isTyping: data.isTyping,
    });
  }

  @SubscribeMessage('chat:react')
  async handleReaction(
    @ConnectedSocket() client: Socket,
    @MessageBody() dto: ReactToMessageDto,
  ) {
    const reaction = await this.chatService.addReaction(dto);
    this.server.to(dto.roomId).emit('chat:reaction', reaction);
  }
}
```

---

##### 2.1.2 Media Control Module

**Location:** `src/features/room-features/media/`

**Structure:**
```
src/features/room-features/media/
├── interfaces/
│   ├── media-device.interface.ts
│   └── media-settings.interface.ts
├── enums/
│   ├── media-type.enum.ts
│   └── media-quality.enum.ts
├── services/
│   ├── audio-control.service.ts
│   ├── video-control.service.ts
│   ├── screen-share.service.ts
│   └── media-settings.service.ts
├── gateways/
│   └── media.gateway.ts
├── media.module.ts
└── index.ts
```

**Features:**
- ✅ Audio mute/unmute
- ✅ Video on/off
- ✅ Screen sharing
- ✅ Media device selection
- ✅ Quality settings
- ✅ Bandwidth management

---

##### 2.1.3 YouTube Sync Module

**Location:** `src/features/room-features/youtube-sync/`

**Structure:**
```
src/features/room-features/youtube-sync/
├── interfaces/
│   ├── youtube-state.interface.ts
│   └── youtube-config.interface.ts
├── enums/
│   └── player-state.enum.ts
├── services/
│   ├── youtube-sync.service.ts
│   └── youtube-api.service.ts
├── gateways/
│   └── youtube-sync.gateway.ts
├── youtube-sync.module.ts
└── index.ts
```

**Features:**
- ✅ Synchronized playback
- ✅ Play/Pause sync
- ✅ Seek sync
- ✅ Video queue
- ✅ Host controls

---

##### 2.1.4 Hand Raise Module

**Location:** `src/features/room-features/hand-raise/`

**Structure:**
```
src/features/room-features/hand-raise/
├── interfaces/
│   └── hand-raise-state.interface.ts
├── services/
│   └── hand-raise.service.ts
├── gateways/
│   └── hand-raise.gateway.ts
├── hand-raise.module.ts
└── index.ts
```

**Features:**
- ✅ Raise/Lower hand
- ✅ Queue management
- ✅ Host acknowledgment
- ✅ Auto-lower after timeout

---

##### 2.1.5 Reactions Module

**Location:** `src/features/room-features/reactions/`

**Structure:**
```
src/features/room-features/reactions/
├── interfaces/
│   └── reaction.interface.ts
├── enums/
│   └── reaction-type.enum.ts
├── services/
│   └── reactions.service.ts
├── gateways/
│   └── reactions.gateway.ts
├── reactions.module.ts
└── index.ts
```

**Features:**
- ✅ Emoji reactions
- ✅ Animated reactions
- ✅ Reaction history
- ✅ Custom reactions

---

##### 2.1.6 Whiteboard Module

**Location:** `src/features/room-features/whiteboard/`

**Structure:**
```
src/features/room-features/whiteboard/
├── interfaces/
│   ├── whiteboard-state.interface.ts
│   ├── drawing-tool.interface.ts
│   └── whiteboard-object.interface.ts
├── enums/
│   ├── tool-type.enum.ts
│   └── object-type.enum.ts
├── services/
│   ├── whiteboard.service.ts
│   ├── drawing.service.ts
│   └── whiteboard-history.service.ts
├── gateways/
│   └── whiteboard.gateway.ts
├── whiteboard.module.ts
└── index.ts
```

**Features:**
- ✅ Real-time drawing
- ✅ Multiple tools (pen, shapes, text)
- ✅ Undo/Redo
- ✅ Save/Load boards
- ✅ Collaborative editing
- ✅ Export to image/PDF

---

##### 2.1.7 Polls Module

**Location:** `src/features/room-features/polls/`

**Structure:**
```
src/features/room-features/polls/
├── interfaces/
│   ├── poll.interface.ts
│   └── poll-option.interface.ts
├── enums/
│   ├── poll-type.enum.ts
│   └── poll-status.enum.ts
├── entities/
│   ├── poll.entity.ts
│   ├── poll-option.entity.ts
│   └── poll-vote.entity.ts
├── dto/
│   ├── create-poll.dto.ts
│   └── vote-poll.dto.ts
├── services/
│   └── polls.service.ts
├── gateways/
│   └── polls.gateway.ts
├── polls.module.ts
└── index.ts
```

**Features:**
- ✅ Create polls
- ✅ Multiple choice
- ✅ Anonymous voting
- ✅ Live results
- ✅ Poll history

---

##### 2.1.8 Waiting Room Module

**Location:** `src/features/room-features/waiting-room/`

**Structure:**
```
src/features/room-features/waiting-room/
├── interfaces/
│   └── waiting-participant.interface.ts
├── enums/
│   └── admission-status.enum.ts
├── services/
│   └── waiting-room.service.ts
├── gateways/
│   └── waiting-room.gateway.ts
├── waiting-room.module.ts
└── index.ts
```

**Features:**
- ✅ Participant queue
- ✅ Host admission controls
- ✅ Admit one/all
- ✅ Deny entry
- ✅ Waiting room notifications

---

##### 2.1.9 Moderation Module

**Location:** `src/features/room-features/moderation/`

**Structure:**
```
src/features/room-features/moderation/
├── interfaces/
│   ├── moderation-action.interface.ts
│   └── moderation-log.interface.ts
├── enums/
│   ├── moderation-action-type.enum.ts
│   └── ban-duration.enum.ts
├── entities/
│   ├── moderation-log.entity.ts
│   └── banned-user.entity.ts
├── services/
│   ├── kick-user.service.ts
│   ├── mute-control.service.ts
│   ├── block-user.service.ts
│   ├── room-lock.service.ts
│   └── moderation-log.service.ts
├── gateways/
│   └── moderation.gateway.ts
├── guards/
│   └── is-moderator.guard.ts
├── moderation.module.ts
└── index.ts
```

**Features:**
- ✅ Kick participants
- ✅ Mute/Unmute
- ✅ Block users
- ✅ Lock/Unlock room
- ✅ Promote to moderator
- ✅ Moderation logs

---

##### 2.1.10 Recording Module

**Location:** `src/features/room-features/recording/`

**Structure:**
```
src/features/room-features/recording/
├── interfaces/
│   ├── recording.interface.ts
│   └── recording-config.interface.ts
├── enums/
│   ├── recording-status.enum.ts
│   └── recording-quality.enum.ts
├── entities/
│   └── recording.entity.ts
├── dto/
│   ├── start-recording.dto.ts
│   └── stop-recording.dto.ts
├── services/
│   ├── recording.service.ts
│   ├── recording-storage.service.ts
│   └── recording-processor.service.ts
├── recording.module.ts
└── index.ts
```

**Features:**
- ✅ Start/Stop recording
- ✅ Cloud storage
- ✅ Recording playback
- ✅ Download recordings
- ✅ Recording permissions

---

##### 2.1.11 Analytics Module

**Location:** `src/features/room-features/analytics/`

**Structure:**
```
src/features/room-features/analytics/
├── interfaces/
│   ├── analytics-event.interface.ts
│   └── engagement-metrics.interface.ts
├── enums/
│   └── event-type.enum.ts
├── entities/
│   ├── analytics-event.entity.ts
│   └── engagement-metric.entity.ts
├── services/
│   ├── engagement-tracker.service.ts
│   ├── metrics-collector.service.ts
│   └── analytics-reporter.service.ts
├── analytics.module.ts
└── index.ts
```

**Features:**
- ✅ Participant engagement
- ✅ Chat activity
- ✅ Attendance tracking
- ✅ Feature usage stats
- ✅ Export reports

---

#### 2.2 Room Types (Các Loại Phòng)

##### 2.2.1 Free Talk Room

**Location:** `src/features/room-types/free-talk-room/`

**Structure:**
```
src/features/room-types/free-talk-room/
├── free-talk-room.service.ts
├── free-talk-room.controller.ts
├── free-talk-room.config.ts
├── free-talk-room.module.ts
└── index.ts
```

**Configuration:**
```typescript
export const FREE_TALK_ROOM_CONFIG: RoomConfig = {
  roomType: RoomType.FREE_TALK,
  displayName: 'Free Talk Room',
  description: 'Casual conversation for language practice',
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
  moderationLevel: ModerationLevel.BASIC,
  defaultSettings: {
    autoMuteOnJoin: false,
    autoVideoOffOnJoin: false,
    waitingRoomEnabled: false,
    chatEnabled: true,
  },
};
```

---

##### 2.2.2 Lesson Room

**Location:** `src/features/room-types/lesson-room/`

**Configuration:**
```typescript
export const LESSON_ROOM_CONFIG: RoomConfig = {
  roomType: RoomType.LESSON,
  displayName: 'Lesson Room',
  description: 'Structured lesson with teacher and students',
  features: [
    RoomFeature.AUDIO,
    RoomFeature.VIDEO,
    RoomFeature.SCREEN_SHARE,
    RoomFeature.CHAT,
    RoomFeature.WHITEBOARD,
    RoomFeature.HAND_RAISE,
    RoomFeature.WAITING_ROOM,
    RoomFeature.MUTE_CONTROL,
    RoomFeature.KICK_USER,
    RoomFeature.RECORDING,
    RoomFeature.ANALYTICS,
  ],
  maxParticipants: 30,
  requiresPayment: true,
  requiresEnrollment: true,
  timeRestricted: true,
  moderationLevel: ModerationLevel.ADVANCED,
};
```

---

##### 2.2.3 Teacher Class Room

**Configuration:**
```typescript
export const TEACHER_CLASS_ROOM_CONFIG: RoomConfig = {
  roomType: RoomType.TEACHER_CLASS,
  displayName: 'Teacher Class',
  description: 'Teacher-led class with interactive features',
  features: [
    RoomFeature.AUDIO,
    RoomFeature.VIDEO,
    RoomFeature.SCREEN_SHARE,
    RoomFeature.CHAT,
    RoomFeature.YOUTUBE_SYNC,
    RoomFeature.WHITEBOARD,
    RoomFeature.POLLS,
    RoomFeature.HAND_RAISE,
    RoomFeature.REACTIONS,
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
  moderationLevel: ModerationLevel.ADVANCED,
};
```

---

### 3. DOMAIN MODULES (Business Logic)

#### 3.1 Course Management Module

**Location:** `src/features/courses/`

**Refactored Structure:**
```
src/features/courses/
├── domain/
│   ├── course.aggregate.ts
│   ├── session.aggregate.ts
│   └── lesson.aggregate.ts
├── application/
│   ├── commands/
│   │   ├── create-course.command.ts
│   │   ├── publish-course.command.ts
│   │   └── add-lesson.command.ts
│   ├── queries/
│   │   ├── get-courses.query.ts
│   │   └── get-course-details.query.ts
│   └── handlers/
│       ├── create-course.handler.ts
│       └── get-courses.handler.ts
├── infrastructure/
│   ├── repositories/
│   │   ├── course.repository.ts
│   │   ├── session.repository.ts
│   │   └── lesson.repository.ts
│   └── persistence/
│       ├── course.entity.ts
│       ├── session.entity.ts
│       └── lesson.entity.ts
├── presentation/
│   ├── controllers/
│   │   ├── courses.controller.ts
│   │   └── enrollment.controller.ts
│   └── dto/
│       ├── create-course.dto.ts
│       └── update-course.dto.ts
└── courses.module.ts
```

**Key Improvements:**
- ✅ CQRS pattern (Command Query Responsibility Segregation)
- ✅ Domain-driven design
- ✅ Repository pattern
- ✅ Clear separation of concerns

---

#### 3.2 Booking Module

**Location:** `src/features/booking/`

**Refactored Structure:**
```
src/features/booking/
├── domain/
│   ├── booking.aggregate.ts
│   └── booking-slot.aggregate.ts
├── application/
│   ├── commands/
│   │   ├── create-booking.command.ts
│   │   └── cancel-booking.command.ts
│   ├── queries/
│   │   └── get-available-slots.query.ts
│   └── handlers/
├── infrastructure/
│   ├── repositories/
│   └── persistence/
├── presentation/
│   ├── controllers/
│   └── dto/
└── booking.module.ts
```

---

#### 3.3 Marketplace Module

**Location:** `src/features/marketplace/`

**Refactored Structure:**
```
src/features/marketplace/
├── domain/
│   ├── material.aggregate.ts
│   └── purchase.aggregate.ts
├── application/
│   ├── commands/
│   ├── queries/
│   └── handlers/
├── infrastructure/
│   ├── repositories/
│   └── persistence/
├── presentation/
│   ├── controllers/
│   └── dto/
└── marketplace.module.ts
```

---

### 4. INFRASTRUCTURE MODULES

#### 4.1 Event Bus Module

**Location:** `src/infrastructure/event-bus/`

**Purpose:** Event-driven communication giữa các modules

**Structure:**
```
src/infrastructure/event-bus/
├── interfaces/
│   ├── event.interface.ts
│   └── event-handler.interface.ts
├── events/
│   ├── room-events/
│   │   ├── room-created.event.ts
│   │   ├── user-joined.event.ts
│   │   └── user-left.event.ts
│   ├── payment-events/
│   │   ├── payment-completed.event.ts
│   │   └── refund-issued.event.ts
│   └── course-events/
│       ├── course-published.event.ts
│       └── lesson-completed.event.ts
├── handlers/
│   ├── room-event.handlers.ts
│   ├── payment-event.handlers.ts
│   └── course-event.handlers.ts
├── event-bus.service.ts
├── event-bus.module.ts
└── index.ts
```

**Usage:**
```typescript
// Publish event
this.eventBus.publish(new UserJoinedRoomEvent({
  roomId: 'room-123',
  userId: 'user-456',
  timestamp: new Date(),
}));

// Subscribe to event
@EventsHandler(UserJoinedRoomEvent)
export class UserJoinedRoomHandler implements IEventHandler<UserJoinedRoomEvent> {
  async handle(event: UserJoinedRoomEvent) {
    // Update analytics
    await this.analyticsService.trackJoin(event);
    
    // Send notification
    await this.notificationService.notifyParticipants(event);
  }
}
```

---

#### 4.2 Cache Module (Redis)

**Location:** `src/infrastructure/cache/`

**Structure:**
```
src/infrastructure/cache/
├── interfaces/
│   └── cache-config.interface.ts
├── services/
│   ├── redis-cache.service.ts
│   ├── room-state-cache.service.ts
│   └── session-cache.service.ts
├── decorators/
│   ├── cacheable.decorator.ts
│   └── cache-invalidate.decorator.ts
├── cache.module.ts
└── index.ts
```

**Usage:**
```typescript
@Cacheable({ ttl: 300, key: 'room:state:{{roomId}}' })
async getRoomState(roomId: string): Promise<RoomState> {
  return this.roomStateManager.getState(roomId);
}

@CacheInvalidate({ key: 'room:state:{{roomId}}' })
async updateRoomState(roomId: string, state: Partial<RoomState>) {
  return this.roomStateManager.updateState(roomId, state);
}
```

---

#### 4.3 Queue Module (Bull)

**Location:** `src/infrastructure/queue/`

**Structure:**
```
src/infrastructure/queue/
├── interfaces/
│   └── job.interface.ts
├── processors/
│   ├── email.processor.ts
│   ├── recording.processor.ts
│   └── analytics.processor.ts
├── services/
│   └── queue.service.ts
├── queue.module.ts
└── index.ts
```

**Usage:**
```typescript
// Add job to queue
await this.queueService.addJob('recording', {
  roomId: 'room-123',
  startTime: new Date(),
  duration: 3600,
});

// Process job
@Processor('recording')
export class RecordingProcessor {
  @Process()
  async processRecording(job: Job) {
    const { roomId, startTime, duration } = job.data;
    await this.recordingService.process(roomId, startTime, duration);
  }
}
```

---

## 🔗 Dependency Graph

```
┌─────────────────────────────────────────────────────────────┐
│                     Application Layer                        │
│                                                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Meeting    │  │    Course    │  │   Booking    │      │
│  │  Controller  │  │  Controller  │  │  Controller  │      │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘      │
│         │                  │                  │               │
└─────────┼──────────────────┼──────────────────┼──────────────┘
          │                  │                  │
          ▼                  ▼                  ▼
┌─────────────────────────────────────────────────────────────┐
│                     Service Layer                            │
│                                                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Meeting    │  │    Course    │  │   Booking    │      │
│  │   Service    │  │   Service    │  │   Service    │      │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘      │
│         │                  │                  │               │
│         └──────────┬───────┴──────────────────┘              │
│                    │                                          │
└────────────────────┼──────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                     Core Layer                               │
│                                                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │     Room     │  │    Access    │  │   Payment    │      │
│  │   Factory    │  │   Control    │  │     Core     │      │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘      │
│         │                  │                  │               │
│         └──────────┬───────┴──────────────────┘              │
│                    │                                          │
└────────────────────┼──────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                  Infrastructure Layer                        │
│                                                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Database   │  │     Redis    │  │    Queue     │      │
│  │   (TypeORM)  │  │    (Cache)   │  │    (Bull)    │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

---

## 🚀 Implementation Roadmap

### Phase 1: Foundation (Week 1-2)
**Status:** 🔴 Not Started

**Tasks:**
1. Create Core Modules
   - [ ] Room Core Module
   - [ ] Access Control Module
   - [ ] Payment Core Module
   - [ ] Storage Core Module

2. Setup Infrastructure
   - [ ] Event Bus Module
   - [ ] Cache Module (Redis)
   - [ ] Queue Module (Bull)

3. Testing
   - [ ] Unit tests for core services
   - [ ] Integration tests

**Deliverables:**
- ✅ All core abstractions
- ✅ Infrastructure modules
- ✅ Test coverage > 80%

---

### Phase 2: Feature Extraction (Week 3-5)
**Status:** 🔴 Not Started

**Tasks:**
1. Extract Media Features
   - [ ] Chat Module
   - [ ] Media Control Module
   - [ ] YouTube Sync Module

2. Extract Interactive Features
   - [ ] Hand Raise Module
   - [ ] Reactions Module
   - [ ] Whiteboard Module
   - [ ] Polls Module

3. Extract Moderation Features
   - [ ] Waiting Room Module
   - [ ] Moderation Module

4. Testing
   - [ ] Unit tests for each module
   - [ ] Integration tests

**Deliverables:**
- ✅ All feature modules extracted
- ✅ Feature gateways implemented
- ✅ Test coverage > 80%

---

### Phase 3: Room Types Implementation (Week 6-7)
**Status:** 🔴 Not Started

**Tasks:**
1. Implement Room Types
   - [ ] Free Talk Room Service
   - [ ] Lesson Room Service
   - [ ] Teacher Class Room Service
   - [ ] Webinar Room Service
   - [ ] Interview Room Service

2. Room Factory
   - [ ] Dynamic room creation
   - [ ] Feature composition

3. Testing
   - [ ] E2E tests for each room type

**Deliverables:**
- ✅ All room types implemented
- ✅ Room factory working
- ✅ E2E tests passing

---

### Phase 4: Domain Refactoring (Week 8-9)
**Status:** 🔴 Not Started

**Tasks:**
1. Refactor Course Module
   - [ ] CQRS pattern
   - [ ] Domain-driven design
   - [ ] Repository pattern

2. Refactor Booking Module
   - [ ] CQRS pattern
   - [ ] Domain aggregates

3. Refactor Marketplace Module
   - [ ] CQRS pattern
   - [ ] Domain aggregates

4. Testing
   - [ ] Unit tests
   - [ ] Integration tests

**Deliverables:**
- ✅ All domain modules refactored
- ✅ Clean architecture
- ✅ Test coverage > 80%

---

### Phase 5: Gateway Refactoring (Week 10)
**Status:** 🔴 Not Started

**Tasks:**
1. Simplify Main Gateway
   - [ ] Remove feature-specific logic
   - [ ] Delegate to feature gateways
   - [ ] Implement feature checking

2. Update Frontend
   - [ ] Update API calls
   - [ ] Handle new event structure

3. Testing
   - [ ] Regression tests
   - [ ] E2E tests

**Deliverables:**
- ✅ Simplified gateway
- ✅ Frontend updated
- ✅ All tests passing

---

### Phase 6: Migration & Deployment (Week 11-12)
**Status:** 🔴 Not Started

**Tasks:**
1. Data Migration
   - [ ] Migrate existing meetings
   - [ ] Preserve functionality

2. Parallel Running
   - [ ] Run old and new code together
   - [ ] Feature flags

3. Gradual Rollout
   - [ ] 10% traffic
   - [ ] 50% traffic
   - [ ] 100% traffic

4. Cleanup
   - [ ] Remove old code
   - [ ] Update documentation

**Deliverables:**
- ✅ Fully migrated system
- ✅ Zero downtime
- ✅ Old code removed

---

### Phase 7: Advanced Features (Week 13-14)
**Status:** 🔴 Not Started

**Tasks:**
1. Recording Module
   - [ ] Cloud recording
   - [ ] Playback
   - [ ] Download

2. Analytics Module
   - [ ] Engagement tracking
   - [ ] Reports

3. AI Features
   - [ ] Transcription
   - [ ] Translation
   - [ ] Summarization

**Deliverables:**
- ✅ Advanced features implemented
- ✅ Premium tier ready

---

## 📊 Success Metrics

### Code Quality
- ✅ Test coverage > 80%
- ✅ Largest file < 300 lines
- ✅ Cyclomatic complexity < 10
- ✅ No code duplication

### Performance
- ✅ Join room latency < 500ms
- ✅ Message delivery < 100ms
- ✅ No memory leaks
- ✅ Support 1000+ concurrent rooms

### Business
- ✅ Zero downtime during migration
- ✅ No user-facing bugs
- ✅ Can create new room type in < 1 day
- ✅ Easy to add new features

---

## 🎓 Best Practices

### 1. Module Design
- ✅ Single Responsibility Principle
- ✅ Dependency Injection
- ✅ Interface Segregation
- ✅ Composition over Inheritance

### 2. Code Organization
- ✅ Feature-based structure
- ✅ Clear naming conventions
- ✅ Consistent file structure
- ✅ Proper exports

### 3. Testing
- ✅ Unit tests for services
- ✅ Integration tests for modules
- ✅ E2E tests for user flows
- ✅ Mock external dependencies

### 4. Documentation
- ✅ README for each module
- ✅ API documentation
- ✅ Architecture diagrams
- ✅ Code comments

---

## 📚 Additional Resources

- [NestJS Documentation](https://docs.nestjs.com)
- [Domain-Driven Design](https://martinfowler.com/bliki/DomainDrivenDesign.html)
- [CQRS Pattern](https://martinfowler.com/bliki/CQRS.html)
- [Event-Driven Architecture](https://martinfowler.com/articles/201701-event-driven.html)

---

**Created:** 2025-12-01  
**Version:** 2.0.0  
**Status:** 📋 Complete Documentation
