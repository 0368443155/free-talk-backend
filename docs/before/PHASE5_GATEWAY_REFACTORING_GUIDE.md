# 🔌 Phase 5: Gateway Refactoring - Chi Tiết Implementation

## 📋 Mục Lục
1. [Tổng Quan](#tổng-quan)
2. [Kiến Trúc Gateway Mới](#kiến-trúc-gateway-mới)
3. [Step-by-Step Implementation](#step-by-step-implementation)
4. [Code Examples](#code-examples)
5. [Testing Strategy](#testing-strategy)
6. [Migration Plan](#migration-plan)

---

## 🎯 Tổng Quan

### Mục Tiêu Phase 5

**Timeline:** Week 10 (7 ngày)

**Objectives:**
1. ✅ Simplify main `MeetingsGateway` từ 831 dòng xuống < 200 dòng
2. ✅ Delegate feature logic sang feature-specific gateways
3. ✅ Implement feature checking mechanism
4. ✅ Update frontend để tương thích với cấu trúc mới
5. ✅ Zero downtime deployment

### Vấn Đề Hiện Tại

```typescript
// ❌ BEFORE: Monolithic Gateway (831 lines)
@WebSocketGateway()
export class MeetingsGateway {
  // WebRTC signaling
  @SubscribeMessage('offer')
  handleOffer() { /* 50 lines */ }
  
  // Chat
  @SubscribeMessage('chat:send')
  handleChat() { /* 30 lines */ }
  
  // YouTube sync
  @SubscribeMessage('youtube:play')
  handleYouTube() { /* 40 lines */ }
  
  // Moderation
  @SubscribeMessage('admin:kick')
  handleKick() { /* 60 lines */ }
  
  // ... 20+ more handlers
}
```

### Giải Pháp Mới

```typescript
// ✅ AFTER: Thin Gateway (< 200 lines)
@WebSocketGateway()
export class UnifiedRoomGateway {
  constructor(
    private readonly roomFactory: RoomFactoryService,
    private readonly chatGateway: ChatGateway,
    private readonly mediaGateway: MediaGateway,
    private readonly youtubeGateway: YoutubeSyncGateway,
    private readonly moderationGateway: ModerationGateway,
  ) {}

  @SubscribeMessage('room:join')
  async handleJoinRoom(@MessageBody() data: JoinRoomDto) {
    const roomService = await this.roomFactory.getRoomService(data.roomType);
    // Delegate to room service
    return roomService.handleJoin(data);
  }

  @SubscribeMessage('chat:send')
  async handleChat(@MessageBody() data: SendMessageDto) {
    // Check if chat feature is enabled
    if (!this.hasFeature(data.roomId, RoomFeature.CHAT)) {
      throw new WsException('Chat is disabled');
    }
    // Delegate to chat gateway
    return this.chatGateway.handleSendMessage(data);
  }
}
```

---

## 🏗️ Kiến Trúc Gateway Mới

### Layer Architecture

```
┌─────────────────────────────────────────────────────────┐
│                  CLIENT (Frontend)                       │
│                   Socket.IO Client                       │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│              UNIFIED ROOM GATEWAY                        │
│         (Main entry point, < 200 lines)                  │
│                                                           │
│  - Connection handling                                   │
│  - Room join/leave                                       │
│  - Feature checking                                      │
│  - Event routing                                         │
└────────────────────┬────────────────────────────────────┘
                     │
        ┌────────────┼────────────┐
        │            │            │
        ▼            ▼            ▼
┌──────────┐  ┌──────────┐  ┌──────────┐
│   Chat   │  │  Media   │  │ YouTube  │
│ Gateway  │  │ Gateway  │  │ Gateway  │
└────┬─────┘  └────┬─────┘  └────┬─────┘
     │             │             │
     └─────────────┼─────────────┘
                   │
                   ▼
         ┌─────────────────┐
         │  Room Service   │
         │    (Factory)    │
         └─────────────────┘
```

### Gateway Responsibilities

| Gateway | Responsibility | Lines | Events |
|---------|---------------|-------|--------|
| **UnifiedRoomGateway** | Connection, routing, feature checking | < 200 | 5-7 |
| **ChatGateway** | Chat messages, reactions, typing | < 150 | 5-6 |
| **MediaGateway** | Audio, video, screen share | < 100 | 4-5 |
| **YoutubeSyncGateway** | YouTube playback sync | < 80 | 3-4 |
| **HandRaiseGateway** | Hand raise/lower | < 50 | 2-3 |
| **ReactionsGateway** | Emoji reactions | < 50 | 2-3 |
| **WhiteboardGateway** | Whiteboard drawing | < 150 | 6-8 |
| **PollsGateway** | Polls creation/voting | < 100 | 4-5 |
| **WaitingRoomGateway** | Admission controls | < 80 | 3-4 |
| **ModerationGateway** | Kick, mute, block | < 120 | 5-6 |

---

## 📝 Step-by-Step Implementation

### Step 1: Create Base Gateway Class

**File:** `src/core/room/gateways/base-room.gateway.ts`

```typescript
import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { RoomFactoryService } from '../services/room-factory.service';
import { RoomFeature } from '../enums/room-feature.enum';

export abstract class BaseRoomGateway {
  @WebSocketServer()
  protected server: Server;

  protected readonly logger: Logger;

  constructor(
    protected readonly roomFactory: RoomFactoryService,
  ) {
    this.logger = new Logger(this.constructor.name);
  }

  /**
   * Check if a room has a specific feature enabled
   */
  protected async hasFeature(
    roomId: string,
    feature: RoomFeature,
  ): Promise<boolean> {
    try {
      const room = await this.getRoomInfo(roomId);
      const roomService = await this.roomFactory.getRoomService(room.type);
      return roomService.hasFeature(feature);
    } catch (error) {
      this.logger.error(`Error checking feature: ${error.message}`);
      return false;
    }
  }

  /**
   * Get room information from database or cache
   */
  protected abstract getRoomInfo(roomId: string): Promise<{
    id: string;
    type: string;
    [key: string]: any;
  }>;

  /**
   * Broadcast event to all clients in a room
   */
  protected broadcastToRoom(roomId: string, event: string, data: any): void {
    this.server.to(roomId).emit(event, data);
  }

  /**
   * Broadcast event to all clients except sender
   */
  protected broadcastToRoomExcept(
    roomId: string,
    socketId: string,
    event: string,
    data: any,
  ): void {
    this.server.to(roomId).except(socketId).emit(event, data);
  }

  /**
   * Send event to specific client
   */
  protected sendToClient(socketId: string, event: string, data: any): void {
    this.server.to(socketId).emit(event, data);
  }

  /**
   * Validate client is in room
   */
  protected async validateClientInRoom(
    client: Socket,
    roomId: string,
  ): Promise<boolean> {
    const rooms = Array.from(client.rooms);
    return rooms.includes(roomId);
  }
}
```

---

### Step 2: Create Unified Room Gateway

**File:** `src/features/room-gateway/unified-room.gateway.ts`

```typescript
import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
  WsException,
} from '@nestjs/websockets';
import { Socket } from 'socket.io';
import { Injectable, UseGuards } from '@nestjs/common';
import { BaseRoomGateway } from '@/core/room/gateways/base-room.gateway';
import { RoomFactoryService } from '@/core/room/services/room-factory.service';
import { WsJwtGuard } from '@/core/auth/guards/ws-jwt.guard';
import { JoinRoomDto, LeaveRoomDto } from './dto';
import { RoomStateManagerService } from '@/core/room/services/room-state-manager.service';

@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL,
    credentials: true,
  },
  transports: ['websocket', 'polling'],
  pingTimeout: 60000,
  pingInterval: 25000,
})
@Injectable()
export class UnifiedRoomGateway
  extends BaseRoomGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  constructor(
    protected readonly roomFactory: RoomFactoryService,
    private readonly roomStateManager: RoomStateManagerService,
  ) {
    super(roomFactory);
  }

  /**
   * Handle client connection
   */
  async handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
    
    try {
      // Extract user from JWT token
      const user = await this.extractUserFromToken(client);
      
      if (!user) {
        this.logger.warn(`Unauthorized connection: ${client.id}`);
        client.disconnect();
        return;
      }

      // Store user info in socket
      client.data.userId = user.id;
      client.data.username = user.username;
      
      this.logger.log(`User ${user.username} connected via ${client.id}`);
    } catch (error) {
      this.logger.error(`Connection error: ${error.message}`);
      client.disconnect();
    }
  }

  /**
   * Handle client disconnection
   */
  async handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);

    try {
      const userId = client.data.userId;
      const rooms = Array.from(client.rooms);

      // Leave all rooms user was in
      for (const roomId of rooms) {
        if (roomId !== client.id) {
          await this.handleLeaveRoom(client, { roomId });
        }
      }
    } catch (error) {
      this.logger.error(`Disconnect error: ${error.message}`);
    }
  }

  /**
   * Handle room join
   */
  @UseGuards(WsJwtGuard)
  @SubscribeMessage('room:join')
  async handleJoinRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() dto: JoinRoomDto,
  ) {
    try {
      const userId = client.data.userId;
      const username = client.data.username;

      this.logger.log(`User ${username} joining room ${dto.roomId}`);

      // Get room service
      const roomService = await this.roomFactory.getRoomService(dto.roomType);

      // Validate access
      const hasAccess = await roomService.validateAccess(userId, dto.roomId);
      if (!hasAccess) {
        throw new WsException('Access denied');
      }

      // Call room-specific join logic
      await roomService.onUserJoin(userId, dto.roomId, dto.metadata);

      // Join socket room
      client.join(dto.roomId);

      // Generate LiveKit token
      const token = await roomService.generateToken(
        userId,
        dto.roomId,
        username,
        dto.isHost || false,
      );

      // Update room state
      await this.roomStateManager.addParticipant(dto.roomId, {
        userId,
        username,
        role: dto.isHost ? 'host' : 'participant',
        isOnline: true,
        joinedAt: new Date(),
      });

      // Notify other participants
      this.broadcastToRoomExcept(dto.roomId, client.id, 'room:user-joined', {
        userId,
        username,
        joinedAt: new Date(),
      });

      // Return join info
      return {
        success: true,
        token,
        roomConfig: roomService.getConfig(),
        participants: await this.roomStateManager.getParticipants(dto.roomId),
      };
    } catch (error) {
      this.logger.error(`Join room error: ${error.message}`);
      throw new WsException(error.message);
    }
  }

  /**
   * Handle room leave
   */
  @UseGuards(WsJwtGuard)
  @SubscribeMessage('room:leave')
  async handleLeaveRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() dto: LeaveRoomDto,
  ) {
    try {
      const userId = client.data.userId;
      const username = client.data.username;

      this.logger.log(`User ${username} leaving room ${dto.roomId}`);

      // Get room info
      const room = await this.getRoomInfo(dto.roomId);
      const roomService = await this.roomFactory.getRoomService(room.type);

      // Call room-specific leave logic
      await roomService.onUserLeave(userId, dto.roomId);

      // Leave socket room
      client.leave(dto.roomId);

      // Update room state
      await this.roomStateManager.removeParticipant(dto.roomId, userId);

      // Notify other participants
      this.broadcastToRoom(dto.roomId, 'room:user-left', {
        userId,
        username,
        leftAt: new Date(),
      });

      return {
        success: true,
        message: 'Left room successfully',
      };
    } catch (error) {
      this.logger.error(`Leave room error: ${error.message}`);
      throw new WsException(error.message);
    }
  }

  /**
   * Get room information
   */
  protected async getRoomInfo(roomId: string): Promise<any> {
    // Try to get from cache first
    const cached = await this.roomStateManager.getRoomState(roomId);
    if (cached) {
      return { id: roomId, type: cached.roomType };
    }

    // Fallback to database
    // This should be implemented based on your database structure
    throw new Error('Room not found');
  }

  /**
   * Extract user from JWT token
   */
  private async extractUserFromToken(client: Socket): Promise<any> {
    // Implementation depends on your auth strategy
    // This is a placeholder
    const token = client.handshake.auth.token;
    if (!token) return null;
    
    // Verify and decode token
    // Return user object
    return { id: 'user-id', username: 'username' };
  }
}
```

---

### Step 3: Create Feature Gateways

#### Chat Gateway

**File:** `src/features/room-features/chat/gateways/chat.gateway.ts`

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
import { ChatService } from '../services/chat.service';
import { SendMessageDto, EditMessageDto, ReactToMessageDto } from '../dto';

@WebSocketGateway({ namespace: '/chat' })
@Injectable()
export class ChatGateway extends BaseRoomGateway {
  constructor(
    roomFactory: RoomFactoryService,
    private readonly chatService: ChatService,
  ) {
    super(roomFactory);
  }

  /**
   * Send chat message
   */
  @UseGuards(WsJwtGuard)
  @SubscribeMessage('chat:send')
  async handleSendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() dto: SendMessageDto,
  ) {
    try {
      // Validate feature is enabled
      const hasChat = await this.hasFeature(dto.roomId, RoomFeature.CHAT);
      if (!hasChat) {
        throw new WsException('Chat is disabled in this room');
      }

      // Validate client is in room
      const inRoom = await this.validateClientInRoom(client, dto.roomId);
      if (!inRoom) {
        throw new WsException('You are not in this room');
      }

      const userId = client.data.userId;
      const username = client.data.username;

      // Save message
      const message = await this.chatService.sendMessage({
        roomId: dto.roomId,
        userId,
        username,
        message: dto.message,
        replyTo: dto.replyTo,
      });

      // Broadcast to room
      this.broadcastToRoom(dto.roomId, 'chat:message', message);

      return {
        success: true,
        message,
      };
    } catch (error) {
      this.logger.error(`Send message error: ${error.message}`);
      throw new WsException(error.message);
    }
  }

  /**
   * Handle typing indicator
   */
  @UseGuards(WsJwtGuard)
  @SubscribeMessage('chat:typing')
  async handleTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string; isTyping: boolean },
  ) {
    try {
      const userId = client.data.userId;
      const username = client.data.username;

      // Broadcast to others in room
      this.broadcastToRoomExcept(data.roomId, client.id, 'chat:user-typing', {
        userId,
        username,
        isTyping: data.isTyping,
      });

      return { success: true };
    } catch (error) {
      this.logger.error(`Typing error: ${error.message}`);
      throw new WsException(error.message);
    }
  }

  /**
   * React to message
   */
  @UseGuards(WsJwtGuard)
  @SubscribeMessage('chat:react')
  async handleReaction(
    @ConnectedSocket() client: Socket,
    @MessageBody() dto: ReactToMessageDto,
  ) {
    try {
      const userId = client.data.userId;

      // Add reaction
      const reaction = await this.chatService.addReaction({
        messageId: dto.messageId,
        userId,
        emoji: dto.emoji,
      });

      // Broadcast to room
      this.broadcastToRoom(dto.roomId, 'chat:reaction', reaction);

      return {
        success: true,
        reaction,
      };
    } catch (error) {
      this.logger.error(`Reaction error: ${error.message}`);
      throw new WsException(error.message);
    }
  }

  /**
   * Edit message
   */
  @UseGuards(WsJwtGuard)
  @SubscribeMessage('chat:edit')
  async handleEditMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() dto: EditMessageDto,
  ) {
    try {
      const userId = client.data.userId;

      // Edit message (only owner can edit)
      const message = await this.chatService.editMessage({
        messageId: dto.messageId,
        userId,
        newMessage: dto.message,
      });

      // Broadcast to room
      this.broadcastToRoom(dto.roomId, 'chat:message-edited', message);

      return {
        success: true,
        message,
      };
    } catch (error) {
      this.logger.error(`Edit message error: ${error.message}`);
      throw new WsException(error.message);
    }
  }

  /**
   * Delete message
   */
  @UseGuards(WsJwtGuard)
  @SubscribeMessage('chat:delete')
  async handleDeleteMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string; messageId: string },
  ) {
    try {
      const userId = client.data.userId;

      // Delete message (only owner or moderator can delete)
      await this.chatService.deleteMessage({
        messageId: data.messageId,
        userId,
      });

      // Broadcast to room
      this.broadcastToRoom(data.roomId, 'chat:message-deleted', {
        messageId: data.messageId,
      });

      return { success: true };
    } catch (error) {
      this.logger.error(`Delete message error: ${error.message}`);
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

### Step 4: Create Gateway Module

**File:** `src/features/room-gateway/room-gateway.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { UnifiedRoomGateway } from './unified-room.gateway';
import { RoomModule } from '@/core/room/room.module';
import { ChatModule } from '@/features/room-features/chat/chat.module';
import { MediaModule } from '@/features/room-features/media/media.module';
import { YoutubeSyncModule } from '@/features/room-features/youtube-sync/youtube-sync.module';
import { ModerationModule } from '@/features/room-features/moderation/moderation.module';

@Module({
  imports: [
    RoomModule,
    ChatModule,
    MediaModule,
    YoutubeSyncModule,
    ModerationModule,
  ],
  providers: [UnifiedRoomGateway],
  exports: [UnifiedRoomGateway],
})
export class RoomGatewayModule {}
```

---

### Step 5: Update App Module

**File:** `src/app.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { RoomGatewayModule } from './features/room-gateway/room-gateway.module';
// ... other imports

@Module({
  imports: [
    // ... existing modules
    RoomGatewayModule,
  ],
})
export class AppModule {}
```

---

## 🧪 Testing Strategy

### Unit Tests

**File:** `src/features/room-gateway/unified-room.gateway.spec.ts`

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { UnifiedRoomGateway } from './unified-room.gateway';
import { RoomFactoryService } from '@/core/room/services/room-factory.service';
import { RoomStateManagerService } from '@/core/room/services/room-state-manager.service';

describe('UnifiedRoomGateway', () => {
  let gateway: UnifiedRoomGateway;
  let roomFactory: RoomFactoryService;
  let roomStateManager: RoomStateManagerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UnifiedRoomGateway,
        {
          provide: RoomFactoryService,
          useValue: {
            getRoomService: jest.fn(),
          },
        },
        {
          provide: RoomStateManagerService,
          useValue: {
            addParticipant: jest.fn(),
            removeParticipant: jest.fn(),
            getParticipants: jest.fn(),
          },
        },
      ],
    }).compile();

    gateway = module.get<UnifiedRoomGateway>(UnifiedRoomGateway);
    roomFactory = module.get<RoomFactoryService>(RoomFactoryService);
    roomStateManager = module.get<RoomStateManagerService>(
      RoomStateManagerService,
    );
  });

  it('should be defined', () => {
    expect(gateway).toBeDefined();
  });

  describe('handleJoinRoom', () => {
    it('should allow user to join room with valid access', async () => {
      const mockClient = {
        id: 'socket-123',
        data: { userId: 'user-123', username: 'testuser' },
        join: jest.fn(),
      } as any;

      const mockRoomService = {
        validateAccess: jest.fn().mockResolvedValue(true),
        onUserJoin: jest.fn(),
        generateToken: jest.fn().mockResolvedValue('mock-token'),
        getConfig: jest.fn().mockReturnValue({ roomType: 'lesson' }),
      };

      jest.spyOn(roomFactory, 'getRoomService').mockResolvedValue(mockRoomService as any);
      jest.spyOn(roomStateManager, 'getParticipants').mockResolvedValue([]);

      const result = await gateway.handleJoinRoom(mockClient, {
        roomId: 'room-123',
        roomType: 'lesson',
      });

      expect(result.success).toBe(true);
      expect(result.token).toBe('mock-token');
      expect(mockClient.join).toHaveBeenCalledWith('room-123');
    });

    it('should deny access if user does not have permission', async () => {
      const mockClient = {
        id: 'socket-123',
        data: { userId: 'user-123', username: 'testuser' },
      } as any;

      const mockRoomService = {
        validateAccess: jest.fn().mockResolvedValue(false),
      };

      jest.spyOn(roomFactory, 'getRoomService').mockResolvedValue(mockRoomService as any);

      await expect(
        gateway.handleJoinRoom(mockClient, {
          roomId: 'room-123',
          roomType: 'lesson',
        }),
      ).rejects.toThrow('Access denied');
    });
  });
});
```

---

### Integration Tests

**File:** `test/room-gateway.e2e-spec.ts`

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { io, Socket } from 'socket.io-client';
import { AppModule } from '@/app.module';

describe('Room Gateway (e2e)', () => {
  let app: INestApplication;
  let client: Socket;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.listen(3000);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach((done) => {
    client = io('http://localhost:3000', {
      auth: {
        token: 'valid-jwt-token',
      },
    });
    client.on('connect', done);
  });

  afterEach(() => {
    client.close();
  });

  it('should connect successfully', (done) => {
    expect(client.connected).toBe(true);
    done();
  });

  it('should join room successfully', (done) => {
    client.emit('room:join', {
      roomId: 'test-room-123',
      roomType: 'free_talk',
    });

    client.on('room:joined', (data) => {
      expect(data.success).toBe(true);
      expect(data.token).toBeDefined();
      done();
    });
  });

  it('should receive user-joined event when another user joins', (done) => {
    const client2 = io('http://localhost:3000', {
      auth: {
        token: 'valid-jwt-token-2',
      },
    });

    client.emit('room:join', {
      roomId: 'test-room-123',
      roomType: 'free_talk',
    });

    client.on('room:user-joined', (data) => {
      expect(data.userId).toBeDefined();
      expect(data.username).toBeDefined();
      client2.close();
      done();
    });

    client2.emit('room:join', {
      roomId: 'test-room-123',
      roomType: 'free_talk',
    });
  });
});
```

---

## 🚀 Migration Plan

### Week 10 Schedule

#### Day 1-2: Gateway Refactoring
- [ ] Create `BaseRoomGateway`
- [ ] Create `UnifiedRoomGateway`
- [ ] Write unit tests
- [ ] Code review

#### Day 3-4: Feature Gateways
- [ ] Create `ChatGateway`
- [ ] Create `MediaGateway`
- [ ] Create `YoutubeSyncGateway`
- [ ] Create `ModerationGateway`
- [ ] Write unit tests

#### Day 5: Integration
- [ ] Update `AppModule`
- [ ] Integration tests
- [ ] E2E tests

#### Day 6: Frontend Updates
- [ ] Update socket event handlers
- [ ] Update API calls
- [ ] Frontend testing

#### Day 7: Deployment
- [ ] Deploy to staging
- [ ] Smoke tests
- [ ] Deploy to production
- [ ] Monitor

### Deployment Strategy

```typescript
// Feature flag for gradual rollout
const USE_NEW_GATEWAY = process.env.USE_NEW_GATEWAY === 'true';

@Module({
  providers: [
    {
      provide: 'ROOM_GATEWAY',
      useClass: USE_NEW_GATEWAY ? UnifiedRoomGateway : MeetingsGateway,
    },
  ],
})
export class AppModule {}
```

---

## 📊 Success Metrics

### Code Quality
- ✅ Main gateway < 200 lines
- ✅ Feature gateways < 150 lines each
- ✅ Test coverage > 80%
- ✅ No code duplication

### Performance
- ✅ Join room latency < 500ms
- ✅ Message delivery < 100ms
- ✅ No memory leaks
- ✅ Support 1000+ concurrent connections

### Business
- ✅ Zero downtime deployment
- ✅ No user-facing bugs
- ✅ All features working
- ✅ Easy to add new features

---

**Status:** 🔴 Not Started  
**Timeline:** Week 10  
**Priority:** High  
**Risk:** High (Breaking changes)
