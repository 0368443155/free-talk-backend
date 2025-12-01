# 🔧 REFACTOR REMAINING TASKS - Các Tác Vụ Refactor Còn Lại

**Ngày tạo:** 2025-12-01  
**Mục đích:** Hoàn thiện việc refactor hệ thống sang kiến trúc modular  
**Ưu tiên:** Critical

---

## 📋 MỤC LỤC

1. [Tổng Quan](#tổng-quan)
2. [Task 1: Migrate Old Gateway](#task-1-migrate-old-gateway)
3. [Task 2: Refactor Large Services](#task-2-refactor-large-services)
4. [Task 3: Implement CQRS Pattern](#task-3-implement-cqrs-pattern)
5. [Task 4: Setup Feature Flags](#task-4-setup-feature-flags)
6. [Task 5: Data Migration](#task-5-data-migration)
7. [Task 6: Testing](#task-6-testing)

---

## 🎯 TỔNG QUAN

### Trạng Thái Hiện Tại

```
Refactor Progress: 80% ████████████████░░░░

✅ Completed:
  - Core modules created
  - Feature modules extracted
  - Room types implemented
  - New gateway structure ready

⚠️ Remaining:
  - Old gateway still active (831 lines)
  - Large services not refactored (1,056 + 891 lines)
  - No feature flags
  - No migration scripts
  - Low test coverage
```

### Mục Tiêu

- ✅ Migrate 100% traffic to new gateway
- ✅ Deprecate old monolithic code
- ✅ Refactor large services
- ✅ Achieve 80%+ test coverage
- ✅ Zero downtime deployment

---

## 🚀 TASK 1: Migrate Old Gateway

### Mục Tiêu
Migrate từ `meetings.gateway.ts` (831 lines) sang `unified-room.gateway.ts`

### Timeline
**2 tuần** (Week 1-2)

---

### Step 1.1: Analyze Old Gateway Events

**File:** `src/features/meeting/meetings.gateway.ts`

**Danh sách events cần migrate:**

```typescript
// WebRTC Signaling Events
@SubscribeMessage('offer')           → Migrate to MediaGateway
@SubscribeMessage('answer')          → Migrate to MediaGateway
@SubscribeMessage('ice-candidate')   → Migrate to MediaGateway

// Media Control Events
@SubscribeMessage('toggle-audio')    → Migrate to MediaGateway
@SubscribeMessage('toggle-video')    → Migrate to MediaGateway
@SubscribeMessage('screen-share')    → Migrate to MediaGateway

// Chat Events
@SubscribeMessage('chat:send')       → Already in ChatGateway ✅
@SubscribeMessage('chat:typing')     → Already in ChatGateway ✅

// YouTube Events
@SubscribeMessage('youtube:play')    → Migrate to YoutubeSyncGateway
@SubscribeMessage('youtube:pause')   → Migrate to YoutubeSyncGateway
@SubscribeMessage('youtube:seek')    → Migrate to YoutubeSyncGateway

// Moderation Events
@SubscribeMessage('admin:kick')      → Migrate to ModerationGateway
@SubscribeMessage('admin:mute')      → Migrate to ModerationGateway
@SubscribeMessage('admin:block')     → Migrate to ModerationGateway

// Hand Raise Events
@SubscribeMessage('hand:raise')      → Already in HandRaiseGateway ✅
@SubscribeMessage('hand:lower')      → Already in HandRaiseGateway ✅

// Waiting Room Events
@SubscribeMessage('waiting:admit')   → Already in WaitingRoomGateway ✅
@SubscribeMessage('waiting:deny')    → Already in WaitingRoomGateway ✅
```

---

### Step 1.2: Create Event Mapping Document

**File:** `docs/after_refactor/EVENT_MIGRATION_MAP.md`

```markdown
# Event Migration Mapping

| Old Event | New Gateway | New Event | Status |
|-----------|-------------|-----------|--------|
| offer | MediaGateway | media:offer | ⏳ TODO |
| answer | MediaGateway | media:answer | ⏳ TODO |
| ice-candidate | MediaGateway | media:ice-candidate | ⏳ TODO |
| toggle-audio | MediaGateway | media:toggle-audio | ⏳ TODO |
| toggle-video | MediaGateway | media:toggle-video | ⏳ TODO |
| screen-share | MediaGateway | media:screen-share | ⏳ TODO |
| chat:send | ChatGateway | chat:send | ✅ DONE |
| youtube:play | YoutubeSyncGateway | youtube:play | ⏳ TODO |
| admin:kick | ModerationGateway | moderation:kick | ⏳ TODO |
```

---

### Step 1.3: Implement Missing Events in Feature Gateways

#### MediaGateway - Add WebRTC Events

**File:** `src/features/room-features/media/gateways/media.gateway.ts`

```typescript
import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  WsException,
} from '@nestjs/websockets';
import { Socket } from 'socket.io';
import { Injectable, UseGuards } from '@nestjs/common';
import { BaseRoomGateway } from '@/core/room/gateways/base-room.gateway';
import { RoomFeature } from '@/core/room/enums/room-feature.enum';
import { WsJwtGuard } from '@/core/auth/guards/ws-jwt.guard';

@WebSocketGateway({ namespace: '/media' })
@Injectable()
export class MediaGateway extends BaseRoomGateway {
  /**
   * Handle WebRTC offer
   */
  @UseGuards(WsJwtGuard)
  @SubscribeMessage('media:offer')
  async handleOffer(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: {
      roomId: string;
      targetUserId: string;
      offer: RTCSessionDescriptionInit;
    },
  ) {
    try {
      // Validate feature enabled
      const hasMedia = await this.hasFeature(data.roomId, RoomFeature.VIDEO);
      if (!hasMedia) {
        throw new WsException('Media is disabled in this room');
      }

      // Forward offer to target user
      this.sendToClient(data.targetUserId, 'media:offer', {
        fromUserId: client.data.userId,
        offer: data.offer,
      });

      return { success: true };
    } catch (error) {
      this.logger.error(`Offer error: ${error.message}`);
      throw new WsException(error.message);
    }
  }

  /**
   * Handle WebRTC answer
   */
  @UseGuards(WsJwtGuard)
  @SubscribeMessage('media:answer')
  async handleAnswer(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: {
      roomId: string;
      targetUserId: string;
      answer: RTCSessionDescriptionInit;
    },
  ) {
    try {
      // Forward answer to target user
      this.sendToClient(data.targetUserId, 'media:answer', {
        fromUserId: client.data.userId,
        answer: data.answer,
      });

      return { success: true };
    } catch (error) {
      this.logger.error(`Answer error: ${error.message}`);
      throw new WsException(error.message);
    }
  }

  /**
   * Handle ICE candidate
   */
  @UseGuards(WsJwtGuard)
  @SubscribeMessage('media:ice-candidate')
  async handleIceCandidate(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: {
      roomId: string;
      targetUserId: string;
      candidate: RTCIceCandidateInit;
    },
  ) {
    try {
      // Forward ICE candidate to target user
      this.sendToClient(data.targetUserId, 'media:ice-candidate', {
        fromUserId: client.data.userId,
        candidate: data.candidate,
      });

      return { success: true };
    } catch (error) {
      this.logger.error(`ICE candidate error: ${error.message}`);
      throw new WsException(error.message);
    }
  }

  /**
   * Toggle audio
   */
  @UseGuards(WsJwtGuard)
  @SubscribeMessage('media:toggle-audio')
  async handleToggleAudio(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: {
      roomId: string;
      enabled: boolean;
    },
  ) {
    try {
      const userId = client.data.userId;

      // Update room state
      await this.roomStateManager.updateParticipant(data.roomId, userId, {
        isMuted: !data.enabled,
      });

      // Broadcast to room
      this.broadcastToRoom(data.roomId, 'media:audio-toggled', {
        userId,
        enabled: data.enabled,
      });

      return { success: true };
    } catch (error) {
      this.logger.error(`Toggle audio error: ${error.message}`);
      throw new WsException(error.message);
    }
  }

  /**
   * Toggle video
   */
  @UseGuards(WsJwtGuard)
  @SubscribeMessage('media:toggle-video')
  async handleToggleVideo(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: {
      roomId: string;
      enabled: boolean;
    },
  ) {
    try {
      const userId = client.data.userId;

      // Update room state
      await this.roomStateManager.updateParticipant(data.roomId, userId, {
        isVideoOff: !data.enabled,
      });

      // Broadcast to room
      this.broadcastToRoom(data.roomId, 'media:video-toggled', {
        userId,
        enabled: data.enabled,
      });

      return { success: true };
    } catch (error) {
      this.logger.error(`Toggle video error: ${error.message}`);
      throw new WsException(error.message);
    }
  }

  /**
   * Screen share
   */
  @UseGuards(WsJwtGuard)
  @SubscribeMessage('media:screen-share')
  async handleScreenShare(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: {
      roomId: string;
      enabled: boolean;
    },
  ) {
    try {
      // Validate feature enabled
      const hasScreenShare = await this.hasFeature(
        data.roomId,
        RoomFeature.SCREEN_SHARE,
      );
      if (!hasScreenShare) {
        throw new WsException('Screen share is disabled in this room');
      }

      const userId = client.data.userId;

      // Update room state
      await this.roomStateManager.updateParticipant(data.roomId, userId, {
        isScreenSharing: data.enabled,
      });

      // Broadcast to room
      this.broadcastToRoom(data.roomId, 'media:screen-share-toggled', {
        userId,
        enabled: data.enabled,
      });

      return { success: true };
    } catch (error) {
      this.logger.error(`Screen share error: ${error.message}`);
      throw new WsException(error.message);
    }
  }

  protected async getRoomInfo(roomId: string): Promise<any> {
    // Implementation
    return { id: roomId, type: 'lesson' };
  }
}
```

---

### Step 1.4: Update Frontend to Use New Events

**File:** `talkplatform-frontend/hooks/use-meeting-socket.ts`

```typescript
// OLD
socket.emit('offer', { targetUserId, offer });
socket.emit('toggle-audio', { enabled });

// NEW
socket.emit('media:offer', { roomId, targetUserId, offer });
socket.emit('media:toggle-audio', { roomId, enabled });
```

**Migration Strategy:**
1. Support both old and new events temporarily
2. Gradual frontend rollout
3. Deprecate old events after 100% migration

```typescript
// Backward compatible approach
export function useMeetingSocket(roomId: string) {
  const useNewEvents = useFeatureFlag('use_new_gateway_events');

  const toggleAudio = (enabled: boolean) => {
    if (useNewEvents) {
      socket.emit('media:toggle-audio', { roomId, enabled });
    } else {
      socket.emit('toggle-audio', { enabled });
    }
  };

  return { toggleAudio };
}
```

---

### Step 1.5: Deprecate Old Gateway

**File:** `src/features/meeting/meetings.gateway.ts`

```typescript
@WebSocketGateway()
@Injectable()
export class MeetingsGateway {
  private readonly logger = new Logger(MeetingsGateway.name);

  constructor(
    private readonly featureFlagService: FeatureFlagService,
  ) {}

  async handleConnection(client: Socket) {
    // Check if new gateway is enabled
    const useNewGateway = await this.featureFlagService.isEnabled('use_new_gateway');
    
    if (useNewGateway) {
      this.logger.warn('Old gateway is deprecated. Redirecting to new gateway.');
      client.disconnect();
      return;
    }

    // Old connection logic (will be removed)
    this.logger.warn('Using deprecated gateway. Please migrate to new gateway.');
  }

  // Mark all handlers as deprecated
  @SubscribeMessage('offer')
  @Deprecated('Use media:offer in MediaGateway instead')
  async handleOffer() {
    // ...
  }
}
```

---

### Step 1.6: Testing Plan

#### Unit Tests

**File:** `src/features/room-features/media/gateways/media.gateway.spec.ts`

```typescript
describe('MediaGateway', () => {
  let gateway: MediaGateway;
  let mockClient: Socket;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [MediaGateway, /* ... */],
    }).compile();

    gateway = module.get<MediaGateway>(MediaGateway);
  });

  describe('handleOffer', () => {
    it('should forward offer to target user', async () => {
      const data = {
        roomId: 'room-123',
        targetUserId: 'user-456',
        offer: { type: 'offer', sdp: '...' },
      };

      await gateway.handleOffer(mockClient, data);

      expect(mockClient.to).toHaveBeenCalledWith('user-456');
      expect(mockClient.emit).toHaveBeenCalledWith('media:offer', expect.any(Object));
    });

    it('should throw error if media is disabled', async () => {
      jest.spyOn(gateway, 'hasFeature').mockResolvedValue(false);

      await expect(
        gateway.handleOffer(mockClient, { roomId: 'room-123', /* ... */ }),
      ).rejects.toThrow('Media is disabled');
    });
  });
});
```

#### Integration Tests

**File:** `test/media-gateway.e2e-spec.ts`

```typescript
describe('Media Gateway (e2e)', () => {
  let app: INestApplication;
  let client1: Socket;
  let client2: Socket;

  beforeAll(async () => {
    // Setup app and clients
  });

  it('should establish WebRTC connection between two users', (done) => {
    // Client 1 sends offer
    client1.emit('media:offer', {
      roomId: 'test-room',
      targetUserId: 'user-2',
      offer: { type: 'offer', sdp: 'test-sdp' },
    });

    // Client 2 receives offer
    client2.on('media:offer', (data) => {
      expect(data.fromUserId).toBe('user-1');
      expect(data.offer.sdp).toBe('test-sdp');

      // Client 2 sends answer
      client2.emit('media:answer', {
        roomId: 'test-room',
        targetUserId: 'user-1',
        answer: { type: 'answer', sdp: 'test-answer-sdp' },
      });
    });

    // Client 1 receives answer
    client1.on('media:answer', (data) => {
      expect(data.fromUserId).toBe('user-2');
      expect(data.answer.sdp).toBe('test-answer-sdp');
      done();
    });
  });
});
```

---

### Step 1.7: Rollout Plan

#### Week 1: Preparation
- [ ] Day 1-2: Implement missing events in feature gateways
- [ ] Day 3-4: Update frontend to support both old and new events
- [ ] Day 5: Write unit tests
- [ ] Day 6-7: Write integration tests

#### Week 2: Deployment
- [ ] Day 1: Deploy to staging
- [ ] Day 2: Test on staging
- [ ] Day 3: Enable new gateway for 10% users
- [ ] Day 4: Monitor and fix issues
- [ ] Day 5: Increase to 50%
- [ ] Day 6: Increase to 100%
- [ ] Day 7: Deprecate old gateway

---

## 🔨 TASK 2: Refactor Large Services

### Mục Tiêu
Refactor `courses.service.ts` (1,056 lines) và `meetings.service.ts` (891 lines)

### Timeline
**2 tuần** (Week 3-4)

---

### Step 2.1: Apply CQRS Pattern to CoursesService

#### Current Structure (Monolithic)

```typescript
// courses.service.ts (1,056 lines) ❌
@Injectable()
export class CoursesService {
  // Create operations
  async createCourse() { /* 50 lines */ }
  async addSession() { /* 40 lines */ }
  async addLesson() { /* 35 lines */ }
  
  // Read operations
  async getCourses() { /* 60 lines */ }
  async getCourseDetails() { /* 80 lines */ }
  async getSessionDetails() { /* 45 lines */ }
  
  // Update operations
  async updateCourse() { /* 40 lines */ }
  async publishCourse() { /* 55 lines */ }
  
  // Delete operations
  async deleteCourse() { /* 30 lines */ }
  
  // Business logic
  async generateQRCode() { /* 25 lines */ }
  async validateEnrollment() { /* 70 lines */ }
  // ... 20+ more methods
}
```

#### New Structure (CQRS)

```
src/features/courses/
├── domain/
│   ├── aggregates/
│   │   ├── course.aggregate.ts
│   │   ├── session.aggregate.ts
│   │   └── lesson.aggregate.ts
│   ├── value-objects/
│   │   ├── course-price.vo.ts
│   │   └── session-schedule.vo.ts
│   └── events/
│       ├── course-created.event.ts
│       ├── course-published.event.ts
│       └── session-added.event.ts
│
├── application/
│   ├── commands/
│   │   ├── create-course/
│   │   │   ├── create-course.command.ts
│   │   │   └── create-course.handler.ts
│   │   ├── publish-course/
│   │   │   ├── publish-course.command.ts
│   │   │   └── publish-course.handler.ts
│   │   └── add-session/
│   │       ├── add-session.command.ts
│   │       └── add-session.handler.ts
│   │
│   ├── queries/
│   │   ├── get-courses/
│   │   │   ├── get-courses.query.ts
│   │   │   └── get-courses.handler.ts
│   │   └── get-course-details/
│   │       ├── get-course-details.query.ts
│   │       └── get-course-details.handler.ts
│   │
│   └── services/
│       ├── qr-code.service.ts
│       └── enrollment-validator.service.ts
│
├── infrastructure/
│   ├── repositories/
│   │   ├── course.repository.ts
│   │   ├── session.repository.ts
│   │   └── lesson.repository.ts
│   └── persistence/
│       ├── course.entity.ts
│       ├── session.entity.ts
│       └── lesson.entity.ts
│
└── presentation/
    ├── controllers/
    │   ├── courses.controller.ts
    │   └── enrollment.controller.ts
    └── dto/
        ├── create-course.dto.ts
        └── update-course.dto.ts
```

---

### Step 2.2: Implement Command Handlers

#### Create Course Command

**File:** `src/features/courses/application/commands/create-course/create-course.command.ts`

```typescript
export class CreateCourseCommand {
  constructor(
    public readonly teacherId: string,
    public readonly title: string,
    public readonly description: string,
    public readonly category: string,
    public readonly level: string,
    public readonly language: string,
    public readonly priceFull: number,
    public readonly pricePerSession: number,
    public readonly maxStudents: number,
  ) {}
}
```

**File:** `src/features/courses/application/commands/create-course/create-course.handler.ts`

```typescript
import { CommandHandler, ICommandHandler, EventBus } from '@nestjs/cqrs';
import { CreateCourseCommand } from './create-course.command';
import { CourseRepository } from '../../infrastructure/repositories/course.repository';
import { CourseAggregate } from '../../domain/aggregates/course.aggregate';
import { CourseCreatedEvent } from '../../domain/events/course-created.event';

@CommandHandler(CreateCourseCommand)
export class CreateCourseHandler implements ICommandHandler<CreateCourseCommand> {
  constructor(
    private readonly courseRepository: CourseRepository,
    private readonly eventBus: EventBus,
  ) {}

  async execute(command: CreateCourseCommand): Promise<string> {
    // Create aggregate
    const course = CourseAggregate.create({
      teacherId: command.teacherId,
      title: command.title,
      description: command.description,
      category: command.category,
      level: command.level,
      language: command.language,
      priceFull: command.priceFull,
      pricePerSession: command.pricePerSession,
      maxStudents: command.maxStudents,
    });

    // Save to database
    await this.courseRepository.save(course);

    // Publish event
    this.eventBus.publish(
      new CourseCreatedEvent(course.id, course.teacherId, course.title),
    );

    return course.id;
  }
}
```

---

### Step 2.3: Implement Query Handlers

#### Get Courses Query

**File:** `src/features/courses/application/queries/get-courses/get-courses.query.ts`

```typescript
export class GetCoursesQuery {
  constructor(
    public readonly page: number = 1,
    public readonly limit: number = 20,
    public readonly category?: string,
    public readonly level?: string,
    public readonly search?: string,
  ) {}
}
```

**File:** `src/features/courses/application/queries/get-courses/get-courses.handler.ts`

```typescript
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetCoursesQuery } from './get-courses.query';
import { CourseRepository } from '../../infrastructure/repositories/course.repository';

@QueryHandler(GetCoursesQuery)
export class GetCoursesHandler implements IQueryHandler<GetCoursesQuery> {
  constructor(private readonly courseRepository: CourseRepository) {}

  async execute(query: GetCoursesQuery) {
    const { page, limit, category, level, search } = query;

    const [courses, total] = await this.courseRepository.findAndCount({
      where: {
        isPublished: true,
        ...(category && { category }),
        ...(level && { level }),
      },
      skip: (page - 1) * limit,
      take: limit,
      order: { createdAt: 'DESC' },
      relations: ['teacher'],
    });

    return {
      data: courses,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}
```

---

### Step 2.4: Update Controller to Use CQRS

**File:** `src/features/courses/presentation/controllers/courses.controller.ts`

```typescript
import { Controller, Post, Get, Body, Query, Param } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { CreateCourseCommand } from '../../application/commands/create-course/create-course.command';
import { GetCoursesQuery } from '../../application/queries/get-courses/get-courses.query';
import { CreateCourseDto } from '../dto/create-course.dto';

@Controller('courses')
export class CoursesController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Post()
  async createCourse(@Body() dto: CreateCourseDto, @User() user: User) {
    const command = new CreateCourseCommand(
      user.id,
      dto.title,
      dto.description,
      dto.category,
      dto.level,
      dto.language,
      dto.priceFull,
      dto.pricePerSession,
      dto.maxStudents,
    );

    const courseId = await this.commandBus.execute(command);

    return { id: courseId };
  }

  @Get()
  async getCourses(
    @Query('page') page: number,
    @Query('limit') limit: number,
    @Query('category') category: string,
    @Query('level') level: string,
    @Query('search') search: string,
  ) {
    const query = new GetCoursesQuery(page, limit, category, level, search);
    return this.queryBus.execute(query);
  }
}
```

---

### Step 2.5: Migration Checklist

#### Courses Service Refactoring

- [ ] Create domain aggregates
- [ ] Create command handlers (8 commands)
- [ ] Create query handlers (6 queries)
- [ ] Create repositories
- [ ] Update controllers
- [ ] Write unit tests
- [ ] Write integration tests
- [ ] Deploy and test

#### Meetings Service Refactoring

- [ ] Create domain aggregates
- [ ] Create command handlers (10 commands)
- [ ] Create query handlers (5 queries)
- [ ] Create repositories
- [ ] Update controllers
- [ ] Write unit tests
- [ ] Write integration tests
- [ ] Deploy and test

---

## ✅ TASK 3: Implement CQRS Pattern

### Benefits

```
✅ Separation of Concerns
✅ Better Testability
✅ Scalability (can scale reads and writes separately)
✅ Event Sourcing ready
✅ Easier to maintain
```

### Implementation Steps

1. **Install Dependencies**
```bash
npm install @nestjs/cqrs
```

2. **Create Module**
```typescript
// courses.module.ts
import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';

@Module({
  imports: [CqrsModule],
  providers: [
    // Command handlers
    CreateCourseHandler,
    PublishCourseHandler,
    // Query handlers
    GetCoursesHandler,
    GetCourseDetailsHandler,
  ],
})
export class CoursesModule {}
```

3. **Test**
```typescript
describe('CreateCourseHandler', () => {
  it('should create course and publish event', async () => {
    const command = new CreateCourseCommand(/* ... */);
    const courseId = await handler.execute(command);
    
    expect(courseId).toBeDefined();
    expect(eventBus.publish).toHaveBeenCalledWith(
      expect.any(CourseCreatedEvent),
    );
  });
});
```

---

## 🎯 TASK 4: Setup Feature Flags

### Implementation

**File:** `src/core/feature-flags/feature-flag.entity.ts`

```typescript
import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity('feature_flags')
export class FeatureFlag {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  name: string;

  @Column({ default: false })
  enabled: boolean;

  @Column({ type: 'int', default: 0 })
  rolloutPercentage: number;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  updatedAt: Date;
}
```

### Seed Data

```sql
INSERT INTO feature_flags (name, enabled, rollout_percentage, description)
VALUES 
  ('use_new_gateway', false, 0, 'Use new modular gateway'),
  ('use_cqrs_courses', false, 0, 'Use CQRS for courses module'),
  ('use_cqrs_meetings', false, 0, 'Use CQRS for meetings module');
```

---

## 📊 TASK 5: Data Migration

### Migration Scripts

**File:** `migrations/005-add-room-type-column.ts`

```typescript
import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddRoomTypeColumn1701234567894 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE meetings 
      ADD COLUMN room_type VARCHAR(50) NULL
    `);

    await queryRunner.query(`
      UPDATE meetings 
      SET room_type = CASE
        WHEN meeting_type = 'free_talk' THEN 'free_talk'
        WHEN meeting_type = 'lesson' THEN 'lesson'
        ELSE 'free_talk'
      END
    `);

    await queryRunner.query(`
      ALTER TABLE meetings 
      ALTER COLUMN room_type SET NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE meetings 
      DROP COLUMN room_type
    `);
  }
}
```

---

## 🧪 TASK 6: Testing

### Test Coverage Goals

```
Unit Tests:        > 80%
Integration Tests: > 70%
E2E Tests:         > 60%
```

### Testing Checklist

- [ ] Unit tests for all command handlers
- [ ] Unit tests for all query handlers
- [ ] Unit tests for all gateways
- [ ] Integration tests for CQRS flow
- [ ] E2E tests for critical user flows
- [ ] Load testing for new gateway
- [ ] Security testing

---

## 📊 PROGRESS TRACKING

### Week-by-Week Plan

```
Week 1-2:  Task 1 - Migrate Old Gateway
Week 3-4:  Task 2 - Refactor Large Services
Week 5:    Task 3 - Implement CQRS
Week 6:    Task 4-5 - Feature Flags & Migration
Week 7:    Task 6 - Testing
Week 8:    Deployment & Monitoring
```

### Success Criteria

- ✅ Old gateway deprecated
- ✅ All services < 300 lines
- ✅ CQRS implemented
- ✅ Test coverage > 80%
- ✅ Zero downtime deployment
- ✅ No performance degradation

---

**Tài liệu này sẽ được cập nhật liên tục khi hoàn thành từng task.**
