# 🚀 Phase 1: Foundation Implementation Guide

## 📋 Overview

Phase 1 tập trung vào việc tạo nền tảng cho kiến trúc module hóa. Chúng ta sẽ tạo các abstractions và services cơ bản mà không làm ảnh hưởng đến code hiện tại.

**Timeline:** 2 weeks  
**Risk Level:** 🟢 Low (không thay đổi code hiện tại)

---

## 🎯 Objectives

1. ✅ Tạo core abstractions (interfaces, enums, base classes)
2. ✅ Tạo room configuration system
3. ✅ Tạo access control module
4. ✅ Tạo room factory service
5. ✅ Setup testing infrastructure

---

## 📁 File Structure

```
talkplatform-backend/src/
├── core/
│   ├── room/
│   │   ├── interfaces/
│   │   │   ├── room-config.interface.ts          # NEW
│   │   │   ├── room-service.interface.ts         # NEW
│   │   │   └── room-feature.interface.ts         # NEW
│   │   ├── enums/
│   │   │   ├── room-feature.enum.ts              # NEW
│   │   │   └── moderation-level.enum.ts          # NEW
│   │   ├── configs/
│   │   │   ├── room-configs.constant.ts          # NEW
│   │   │   ├── free-talk-room.config.ts          # NEW
│   │   │   ├── lesson-room.config.ts             # NEW
│   │   │   └── teacher-class-room.config.ts      # NEW
│   │   ├── services/
│   │   │   ├── base-room.service.ts              # NEW
│   │   │   └── room-factory.service.ts           # NEW
│   │   ├── room.module.ts                        # NEW
│   │   └── index.ts                              # NEW (exports)
│   │
│   └── access-control/
│       ├── interfaces/
│       │   └── access-validator.interface.ts     # NEW
│       ├── services/
│       │   ├── access-validator.service.ts       # NEW
│       │   ├── enrollment-checker.service.ts     # NEW
│       │   └── time-based-access.service.ts      # NEW
│       ├── access-control.module.ts              # NEW
│       └── index.ts                              # NEW
│
└── features/
    └── meeting/
        └── ... (existing files, không thay đổi)
```

---

## 📝 Step-by-Step Implementation

### Step 1: Create Room Feature Enum

**File:** `src/core/room/enums/room-feature.enum.ts`

```typescript
/**
 * Enum defining all possible features that can be enabled in a room
 * Each feature corresponds to a specific module that can be composed
 */
export enum RoomFeature {
  // ============================================
  // CORE FEATURES (Always available)
  // ============================================
  
  /** Audio communication */
  AUDIO = 'audio',
  
  /** Video communication */
  VIDEO = 'video',
  
  /** Screen sharing capability */
  SCREEN_SHARE = 'screen_share',
  
  /** Display list of participants */
  PARTICIPANT_LIST = 'participant_list',
  
  // ============================================
  // INTERACTIVE FEATURES (Optional)
  // ============================================
  
  /** Text chat messaging */
  CHAT = 'chat',
  
  /** Synchronized YouTube video playback */
  YOUTUBE_SYNC = 'youtube_sync',
  
  /** Raise hand to request attention */
  HAND_RAISE = 'hand_raise',
  
  /** Send emoji reactions */
  REACTIONS = 'reactions',
  
  /** Create and respond to polls */
  POLLS = 'polls',
  
  /** Collaborative whiteboard */
  WHITEBOARD = 'whiteboard',
  
  /** File sharing capability */
  FILE_SHARING = 'file_sharing',
  
  // ============================================
  // MODERATION FEATURES (Host controls)
  // ============================================
  
  /** Waiting room for participant approval */
  WAITING_ROOM = 'waiting_room',
  
  /** Ability to remove participants */
  KICK_USER = 'kick_user',
  
  /** Control participant microphones */
  MUTE_CONTROL = 'mute_control',
  
  /** Block users from rejoining */
  BLOCK_USER = 'block_user',
  
  /** Lock room to prevent new joins */
  ROOM_LOCK = 'room_lock',
  
  /** Force stop participant screen share */
  STOP_SCREEN_SHARE = 'stop_screen_share',
  
  /** Promote participant to co-host */
  PROMOTE_PARTICIPANT = 'promote_participant',
  
  // ============================================
  // PREMIUM FEATURES (Paid/Advanced)
  // ============================================
  
  /** Record meeting sessions */
  RECORDING = 'recording',
  
  /** Track engagement and analytics */
  ANALYTICS = 'analytics',
  
  /** Live transcription */
  TRANSCRIPTION = 'transcription',
  
  /** AI-powered features */
  AI_FEATURES = 'ai_features',
}

/**
 * Feature categories for easier management
 */
export const FEATURE_CATEGORIES = {
  CORE: [
    RoomFeature.AUDIO,
    RoomFeature.VIDEO,
    RoomFeature.SCREEN_SHARE,
    RoomFeature.PARTICIPANT_LIST,
  ],
  INTERACTIVE: [
    RoomFeature.CHAT,
    RoomFeature.YOUTUBE_SYNC,
    RoomFeature.HAND_RAISE,
    RoomFeature.REACTIONS,
    RoomFeature.POLLS,
    RoomFeature.WHITEBOARD,
    RoomFeature.FILE_SHARING,
  ],
  MODERATION: [
    RoomFeature.WAITING_ROOM,
    RoomFeature.KICK_USER,
    RoomFeature.MUTE_CONTROL,
    RoomFeature.BLOCK_USER,
    RoomFeature.ROOM_LOCK,
    RoomFeature.STOP_SCREEN_SHARE,
    RoomFeature.PROMOTE_PARTICIPANT,
  ],
  PREMIUM: [
    RoomFeature.RECORDING,
    RoomFeature.ANALYTICS,
    RoomFeature.TRANSCRIPTION,
    RoomFeature.AI_FEATURES,
  ],
} as const;
```

---

### Step 2: Create Moderation Level Enum

**File:** `src/core/room/enums/moderation-level.enum.ts`

```typescript
/**
 * Moderation levels determine what control hosts have over participants
 */
export enum ModerationLevel {
  /** No moderation controls */
  NONE = 'none',
  
  /** Basic controls: mute, kick */
  BASIC = 'basic',
  
  /** Advanced controls: all moderation features */
  ADVANCED = 'advanced',
}
```

---

### Step 3: Create Room Config Interface

**File:** `src/core/room/interfaces/room-config.interface.ts`

```typescript
import { RoomFeature } from '../enums/room-feature.enum';
import { ModerationLevel } from '../enums/moderation-level.enum';

/**
 * Configuration interface for room types
 * This defines the capabilities and constraints of a room
 */
export interface RoomConfig {
  /** Unique identifier for room type */
  roomType: string;
  
  /** Display name for UI */
  displayName: string;
  
  /** Description of room type */
  description: string;
  
  /** List of enabled features */
  features: RoomFeature[];
  
  /** Maximum number of participants allowed */
  maxParticipants: number;
  
  /** Whether payment/credits are required to join */
  requiresPayment: boolean;
  
  /** Whether enrollment is required (for courses/lessons) */
  requiresEnrollment: boolean;
  
  /** Whether access is time-restricted (scheduled meetings) */
  timeRestricted: boolean;
  
  /** Level of moderation controls available */
  moderationLevel: ModerationLevel;
  
  /** Default settings for new rooms of this type */
  defaultSettings?: {
    /** Auto-mute participants on join */
    autoMuteOnJoin?: boolean;
    
    /** Auto-disable video on join */
    autoVideoOffOnJoin?: boolean;
    
    /** Enable waiting room by default */
    waitingRoomEnabled?: boolean;
    
    /** Enable recording by default */
    recordingEnabled?: boolean;
    
    /** Chat enabled by default */
    chatEnabled?: boolean;
  };
  
  /** Access control settings */
  accessControl?: {
    /** Require host approval to join */
    requireHostApproval?: boolean;
    
    /** Allow guests (non-registered users) */
    allowGuests?: boolean;
    
    /** Require password */
    requirePassword?: boolean;
  };
  
  /** LiveKit specific settings */
  livekitSettings?: {
    /** Enable simulcast for video */
    enableSimulcast?: boolean;
    
    /** Enable dynacast */
    enableDynacast?: boolean;
    
    /** Video quality presets */
    videoQuality?: 'low' | 'medium' | 'high';
  };
}

/**
 * Room instance data (runtime state)
 */
export interface RoomInstance {
  id: string;
  roomType: string;
  config: RoomConfig;
  hostId: string;
  createdAt: Date;
  startedAt?: Date;
  endedAt?: Date;
  currentParticipants: number;
  isLocked: boolean;
  metadata?: Record<string, any>;
}
```

---

### Step 4: Create Room Service Interface

**File:** `src/core/room/interfaces/room-service.interface.ts`

```typescript
import { RoomConfig, RoomInstance } from './room-config.interface';
import { RoomFeature } from '../enums/room-feature.enum';

/**
 * Interface that all room services must implement
 */
export interface IRoomService {
  /**
   * Get room configuration
   */
  getConfig(): RoomConfig;
  
  /**
   * Check if a feature is enabled
   */
  hasFeature(feature: RoomFeature): boolean;
  
  /**
   * Validate if user can access the room
   */
  validateAccess(userId: string, roomId: string): Promise<boolean>;
  
  /**
   * Handle user joining the room
   */
  onUserJoin(userId: string, roomId: string, metadata?: any): Promise<void>;
  
  /**
   * Handle user leaving the room
   */
  onUserLeave(userId: string, roomId: string): Promise<void>;
  
  /**
   * Generate LiveKit token for user
   */
  generateToken(
    userId: string,
    roomId: string,
    username: string,
    isHost: boolean,
  ): Promise<string>;
  
  /**
   * Get current room instance data
   */
  getRoomInstance(roomId: string): Promise<RoomInstance | null>;
  
  /**
   * Update room settings
   */
  updateRoomSettings(roomId: string, settings: Partial<RoomConfig['defaultSettings']>): Promise<void>;
}
```

---

### Step 5: Create Room Configurations

**File:** `src/core/room/configs/free-talk-room.config.ts`

```typescript
import { RoomConfig } from '../interfaces/room-config.interface';
import { RoomFeature } from '../enums/room-feature.enum';
import { ModerationLevel } from '../enums/moderation-level.enum';

export const FREE_TALK_ROOM_CONFIG: RoomConfig = {
  roomType: 'free_talk',
  displayName: 'Free Talk Room',
  description: 'Casual conversation room for language practice (max 4 people)',
  
  features: [
    // Core features
    RoomFeature.AUDIO,
    RoomFeature.VIDEO,
    RoomFeature.PARTICIPANT_LIST,
    
    // Interactive features
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
    recordingEnabled: false,
    chatEnabled: true,
  },
  
  accessControl: {
    requireHostApproval: false,
    allowGuests: true,
    requirePassword: false,
  },
  
  livekitSettings: {
    enableSimulcast: true,
    enableDynacast: true,
    videoQuality: 'medium',
  },
};
```

**File:** `src/core/room/configs/lesson-room.config.ts`

```typescript
import { RoomConfig } from '../interfaces/room-config.interface';
import { RoomFeature } from '../enums/room-feature.enum';
import { ModerationLevel } from '../enums/moderation-level.enum';

export const LESSON_ROOM_CONFIG: RoomConfig = {
  roomType: 'lesson',
  displayName: 'Lesson Room',
  description: 'Structured lesson with teacher and students',
  
  features: [
    // Core features
    RoomFeature.AUDIO,
    RoomFeature.VIDEO,
    RoomFeature.SCREEN_SHARE,
    RoomFeature.PARTICIPANT_LIST,
    
    // Interactive features
    RoomFeature.CHAT,
    RoomFeature.WHITEBOARD,
    RoomFeature.HAND_RAISE,
    RoomFeature.FILE_SHARING,
    
    // Moderation features
    RoomFeature.WAITING_ROOM,
    RoomFeature.MUTE_CONTROL,
    RoomFeature.KICK_USER,
    
    // Premium features
    RoomFeature.RECORDING,
    RoomFeature.ANALYTICS,
  ],
  
  maxParticipants: 30,
  requiresPayment: true,
  requiresEnrollment: true,
  timeRestricted: true,
  moderationLevel: ModerationLevel.ADVANCED,
  
  defaultSettings: {
    autoMuteOnJoin: true,
    autoVideoOffOnJoin: false,
    waitingRoomEnabled: true,
    recordingEnabled: true,
    chatEnabled: true,
  },
  
  accessControl: {
    requireHostApproval: true,
    allowGuests: false,
    requirePassword: false,
  },
  
  livekitSettings: {
    enableSimulcast: true,
    enableDynacast: true,
    videoQuality: 'high',
  },
};
```

**File:** `src/core/room/configs/teacher-class-room.config.ts`

```typescript
import { RoomConfig } from '../interfaces/room-config.interface';
import { RoomFeature } from '../enums/room-feature.enum';
import { ModerationLevel } from '../enums/moderation-level.enum';

export const TEACHER_CLASS_ROOM_CONFIG: RoomConfig = {
  roomType: 'teacher_class',
  displayName: 'Teacher Class',
  description: 'Teacher-led class with interactive features',
  
  features: [
    // Core features
    RoomFeature.AUDIO,
    RoomFeature.VIDEO,
    RoomFeature.SCREEN_SHARE,
    RoomFeature.PARTICIPANT_LIST,
    
    // Interactive features
    RoomFeature.CHAT,
    RoomFeature.YOUTUBE_SYNC,
    RoomFeature.WHITEBOARD,
    RoomFeature.POLLS,
    RoomFeature.HAND_RAISE,
    RoomFeature.REACTIONS,
    RoomFeature.FILE_SHARING,
    
    // Moderation features
    RoomFeature.WAITING_ROOM,
    RoomFeature.KICK_USER,
    RoomFeature.MUTE_CONTROL,
    RoomFeature.BLOCK_USER,
    RoomFeature.ROOM_LOCK,
    RoomFeature.STOP_SCREEN_SHARE,
    RoomFeature.PROMOTE_PARTICIPANT,
    
    // Premium features
    RoomFeature.RECORDING,
  ],
  
  maxParticipants: 50,
  requiresPayment: true,
  requiresEnrollment: false,
  timeRestricted: true,
  moderationLevel: ModerationLevel.ADVANCED,
  
  defaultSettings: {
    autoMuteOnJoin: true,
    autoVideoOffOnJoin: false,
    waitingRoomEnabled: true,
    recordingEnabled: false,
    chatEnabled: true,
  },
  
  accessControl: {
    requireHostApproval: true,
    allowGuests: false,
    requirePassword: false,
  },
  
  livekitSettings: {
    enableSimulcast: true,
    enableDynacast: true,
    videoQuality: 'high',
  },
};
```

**File:** `src/core/room/configs/room-configs.constant.ts`

```typescript
import { RoomConfig } from '../interfaces/room-config.interface';
import { FREE_TALK_ROOM_CONFIG } from './free-talk-room.config';
import { LESSON_ROOM_CONFIG } from './lesson-room.config';
import { TEACHER_CLASS_ROOM_CONFIG } from './teacher-class-room.config';

/**
 * Registry of all available room configurations
 */
export const ROOM_CONFIGS: Record<string, RoomConfig> = {
  free_talk: FREE_TALK_ROOM_CONFIG,
  lesson: LESSON_ROOM_CONFIG,
  teacher_class: TEACHER_CLASS_ROOM_CONFIG,
};

/**
 * Get room configuration by type
 */
export function getRoomConfig(roomType: string): RoomConfig {
  const config = ROOM_CONFIGS[roomType];
  if (!config) {
    throw new Error(`Unknown room type: ${roomType}`);
  }
  return config;
}

/**
 * Get all available room types
 */
export function getAvailableRoomTypes(): string[] {
  return Object.keys(ROOM_CONFIGS);
}
```

---

### Step 6: Create Base Room Service

**File:** `src/core/room/services/base-room.service.ts`

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { IRoomService } from '../interfaces/room-service.interface';
import { RoomConfig, RoomInstance } from '../interfaces/room-config.interface';
import { RoomFeature } from '../enums/room-feature.enum';
import { LiveKitService } from '../../../livekit/livekit.service';

/**
 * Abstract base class for all room services
 * Provides common functionality and enforces interface implementation
 */
@Injectable()
export abstract class BaseRoomService implements IRoomService {
  protected readonly logger: Logger;

  constructor(
    protected readonly config: RoomConfig,
    protected readonly livekitService: LiveKitService,
  ) {
    this.logger = new Logger(this.constructor.name);
  }

  /**
   * Get room configuration
   */
  getConfig(): RoomConfig {
    return this.config;
  }

  /**
   * Check if a feature is enabled for this room type
   */
  hasFeature(feature: RoomFeature): boolean {
    return this.config.features.includes(feature);
  }

  /**
   * Validate if user can access the room
   * Must be implemented by subclasses with specific logic
   */
  abstract validateAccess(userId: string, roomId: string): Promise<boolean>;

  /**
   * Handle user joining the room
   * Can be overridden by subclasses for custom logic
   */
  async onUserJoin(userId: string, roomId: string, metadata?: any): Promise<void> {
    this.logger.log(`User ${userId} joining room ${roomId}`);
    // Default implementation - can be overridden
  }

  /**
   * Handle user leaving the room
   * Can be overridden by subclasses for custom logic
   */
  async onUserLeave(userId: string, roomId: string): Promise<void> {
    this.logger.log(`User ${userId} leaving room ${roomId}`);
    // Default implementation - can be overridden
  }

  /**
   * Generate LiveKit token for user
   */
  async generateToken(
    userId: string,
    roomId: string,
    username: string,
    isHost: boolean,
  ): Promise<string> {
    const metadata = JSON.stringify({
      roomType: this.config.roomType,
      userId,
      username,
      isHost,
      joinedAt: new Date().toISOString(),
    });

    if (isHost) {
      return this.livekitService.generateHostToken(
        roomId,
        userId,
        username,
        metadata,
      );
    }

    return this.livekitService.generateParticipantToken(
      roomId,
      userId,
      username,
      metadata,
    );
  }

  /**
   * Get current room instance data
   * Must be implemented by subclasses
   */
  abstract getRoomInstance(roomId: string): Promise<RoomInstance | null>;

  /**
   * Update room settings
   * Can be overridden by subclasses
   */
  async updateRoomSettings(
    roomId: string,
    settings: Partial<RoomConfig['defaultSettings']>,
  ): Promise<void> {
    this.logger.log(`Updating settings for room ${roomId}:`, settings);
    // Default implementation - can be overridden
  }

  /**
   * Validate feature access
   * Throws error if feature is not enabled
   */
  protected validateFeatureAccess(feature: RoomFeature): void {
    if (!this.hasFeature(feature)) {
      throw new Error(
        `Feature ${feature} is not enabled for room type ${this.config.roomType}`,
      );
    }
  }

  /**
   * Check if room is at capacity
   */
  protected async isRoomFull(currentParticipants: number): Promise<boolean> {
    return currentParticipants >= this.config.maxParticipants;
  }
}
```

---

### Step 7: Create Access Validator Service

**File:** `src/core/access-control/services/access-validator.service.ts`

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { EnrollmentCheckerService } from './enrollment-checker.service';
import { TimeBasedAccessService } from './time-based-access.service';

export interface AccessValidationResult {
  allowed: boolean;
  reason?: string;
  requiresPayment?: boolean;
  requiresEnrollment?: boolean;
}

/**
 * Main access validation service
 * Orchestrates different access checks
 */
@Injectable()
export class AccessValidatorService {
  private readonly logger = new Logger(AccessValidatorService.name);

  constructor(
    private readonly enrollmentChecker: EnrollmentCheckerService,
    private readonly timeBasedAccess: TimeBasedAccessService,
  ) {}

  /**
   * Validate complete access for a user to a room
   */
  async validateRoomAccess(
    userId: string,
    roomId: string,
    options: {
      requiresPayment?: boolean;
      requiresEnrollment?: boolean;
      timeRestricted?: boolean;
    },
  ): Promise<AccessValidationResult> {
    this.logger.log(`Validating access for user ${userId} to room ${roomId}`);

    // Check enrollment if required
    if (options.requiresEnrollment) {
      const hasEnrollment = await this.enrollmentChecker.checkEnrollment(
        userId,
        roomId,
      );
      
      if (!hasEnrollment) {
        return {
          allowed: false,
          reason: 'User is not enrolled',
          requiresEnrollment: true,
        };
      }
    }

    // Check payment if required
    if (options.requiresPayment) {
      const hasPaid = await this.enrollmentChecker.checkPayment(userId, roomId);
      
      if (!hasPaid) {
        return {
          allowed: false,
          reason: 'Payment required',
          requiresPayment: true,
        };
      }
    }

    // Check time restrictions
    if (options.timeRestricted) {
      const timeValid = await this.timeBasedAccess.validateTimeAccess(roomId);
      
      if (!timeValid) {
        return {
          allowed: false,
          reason: 'Room is not accessible at this time',
        };
      }
    }

    return { allowed: true };
  }
}
```

**File:** `src/core/access-control/services/enrollment-checker.service.ts`

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CourseEnrollment } from '../../../features/courses/entities/enrollment.entity';
import { SessionPurchase } from '../../../features/courses/entities/session-purchase.entity';

/**
 * Service to check enrollment and payment status
 */
@Injectable()
export class EnrollmentCheckerService {
  private readonly logger = new Logger(EnrollmentCheckerService.name);

  constructor(
    @InjectRepository(CourseEnrollment)
    private readonly enrollmentRepository: Repository<CourseEnrollment>,
    @InjectRepository(SessionPurchase)
    private readonly sessionPurchaseRepository: Repository<SessionPurchase>,
  ) {}

  /**
   * Check if user is enrolled in the course/lesson
   */
  async checkEnrollment(userId: string, roomId: string): Promise<boolean> {
    // Implementation will depend on how roomId maps to course/lesson
    // This is a placeholder
    const enrollment = await this.enrollmentRepository.findOne({
      where: {
        user: { id: userId },
        // Map roomId to course/lesson
      },
    });

    return !!enrollment;
  }

  /**
   * Check if user has paid for access
   */
  async checkPayment(userId: string, roomId: string): Promise<boolean> {
    // Check if user has purchased the session/course
    // This is a placeholder
    return true;
  }
}
```

**File:** `src/core/access-control/services/time-based-access.service.ts`

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Lesson } from '../../../features/courses/entities/lesson.entity';

/**
 * Service to validate time-based access restrictions
 */
@Injectable()
export class TimeBasedAccessService {
  private readonly logger = new Logger(TimeBasedAccessService.name);

  constructor(
    @InjectRepository(Lesson)
    private readonly lessonRepository: Repository<Lesson>,
  ) {}

  /**
   * Validate if room is accessible at current time
   */
  async validateTimeAccess(roomId: string): Promise<boolean> {
    // Find associated lesson
    const lesson = await this.lessonRepository.findOne({
      where: {
        meeting: { id: roomId },
      },
    });

    if (!lesson) {
      // No time restriction if no lesson found
      return true;
    }

    const now = new Date();
    const startTime = new Date(lesson.start_time);
    const endTime = new Date(lesson.end_time);

    // Allow access 15 minutes before start time
    const earlyAccessTime = new Date(startTime.getTime() - 15 * 60 * 1000);

    return now >= earlyAccessTime && now <= endTime;
  }

  /**
   * Get time until room becomes accessible
   */
  async getTimeUntilAccess(roomId: string): Promise<number | null> {
    const lesson = await this.lessonRepository.findOne({
      where: {
        meeting: { id: roomId },
      },
    });

    if (!lesson) return null;

    const now = new Date();
    const startTime = new Date(lesson.start_time);
    const earlyAccessTime = new Date(startTime.getTime() - 15 * 60 * 1000);

    if (now >= earlyAccessTime) return 0;

    return earlyAccessTime.getTime() - now.getTime();
  }
}
```

---

### Step 8: Create Room Factory Service

**File:** `src/core/room/services/room-factory.service.ts`

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { BaseRoomService } from './base-room.service';
import { getRoomConfig } from '../configs/room-configs.constant';

/**
 * Factory service to create room service instances
 * Uses dependency injection to get the appropriate service
 */
@Injectable()
export class RoomFactoryService {
  private readonly logger = new Logger(RoomFactoryService.name);

  constructor(private readonly moduleRef: ModuleRef) {}

  /**
   * Get room service instance for a specific room type
   * Returns the appropriate service based on room type
   */
  async getRoomService(roomType: string): Promise<BaseRoomService> {
    this.logger.log(`Getting room service for type: ${roomType}`);

    // Validate room type exists
    const config = getRoomConfig(roomType);
    
    // For Phase 1, we'll return a default implementation
    // In later phases, this will return specific implementations
    // based on room type (FreeTalkRoomService, LessonRoomService, etc.)
    
    try {
      // Try to get specific service (will be implemented in Phase 3)
      const serviceName = this.getServiceName(roomType);
      return this.moduleRef.get(serviceName, { strict: false });
    } catch (error) {
      this.logger.warn(
        `Specific service not found for ${roomType}, using base implementation`,
      );
      // Fallback to base implementation
      throw new Error(`Room service not implemented for type: ${roomType}`);
    }
  }

  /**
   * Get service name from room type
   */
  private getServiceName(roomType: string): string {
    // Convert room_type to RoomTypeService
    // e.g., 'free_talk' -> 'FreeTalkRoomService'
    const parts = roomType.split('_');
    const className = parts
      .map(part => part.charAt(0).toUpperCase() + part.slice(1))
      .join('');
    return `${className}RoomService`;
  }

  /**
   * Validate if room type is supported
   */
  isRoomTypeSupported(roomType: string): boolean {
    try {
      getRoomConfig(roomType);
      return true;
    } catch {
      return false;
    }
  }
}
```

---

### Step 9: Create Modules

**File:** `src/core/room/room.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { RoomFactoryService } from './services/room-factory.service';
import { BaseRoomService } from './services/base-room.service';
import { LiveKitModule } from '../../livekit/livekit.module';

@Module({
  imports: [LiveKitModule],
  providers: [RoomFactoryService],
  exports: [RoomFactoryService],
})
export class RoomModule {}
```

**File:** `src/core/access-control/access-control.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AccessValidatorService } from './services/access-validator.service';
import { EnrollmentCheckerService } from './services/enrollment-checker.service';
import { TimeBasedAccessService } from './services/time-based-access.service';
import { CourseEnrollment } from '../../features/courses/entities/enrollment.entity';
import { SessionPurchase } from '../../features/courses/entities/session-purchase.entity';
import { Lesson } from '../../features/courses/entities/lesson.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([CourseEnrollment, SessionPurchase, Lesson]),
  ],
  providers: [
    AccessValidatorService,
    EnrollmentCheckerService,
    TimeBasedAccessService,
  ],
  exports: [
    AccessValidatorService,
    EnrollmentCheckerService,
    TimeBasedAccessService,
  ],
})
export class AccessControlModule {}
```

---

### Step 10: Create Index Files for Clean Imports

**File:** `src/core/room/index.ts`

```typescript
// Enums
export * from './enums/room-feature.enum';
export * from './enums/moderation-level.enum';

// Interfaces
export * from './interfaces/room-config.interface';
export * from './interfaces/room-service.interface';

// Services
export * from './services/base-room.service';
export * from './services/room-factory.service';

// Configs
export * from './configs/room-configs.constant';
export * from './configs/free-talk-room.config';
export * from './configs/lesson-room.config';
export * from './configs/teacher-class-room.config';

// Module
export * from './room.module';
```

**File:** `src/core/access-control/index.ts`

```typescript
// Services
export * from './services/access-validator.service';
export * from './services/enrollment-checker.service';
export * from './services/time-based-access.service';

// Module
export * from './access-control.module';
```

---

## 🧪 Testing

### Unit Tests

**File:** `src/core/room/services/base-room.service.spec.ts`

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { BaseRoomService } from './base-room.service';
import { LiveKitService } from '../../../livekit/livekit.service';
import { RoomFeature } from '../enums/room-feature.enum';
import { FREE_TALK_ROOM_CONFIG } from '../configs/free-talk-room.config';

// Concrete implementation for testing
class TestRoomService extends BaseRoomService {
  async validateAccess(userId: string, roomId: string): Promise<boolean> {
    return true;
  }

  async getRoomInstance(roomId: string) {
    return null;
  }
}

describe('BaseRoomService', () => {
  let service: TestRoomService;
  let livekitService: jest.Mocked<LiveKitService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: LiveKitService,
          useValue: {
            generateHostToken: jest.fn(),
            generateParticipantToken: jest.fn(),
          },
        },
      ],
    }).compile();

    livekitService = module.get(LiveKitService);
    service = new TestRoomService(FREE_TALK_ROOM_CONFIG, livekitService);
  });

  describe('hasFeature', () => {
    it('should return true for enabled features', () => {
      expect(service.hasFeature(RoomFeature.AUDIO)).toBe(true);
      expect(service.hasFeature(RoomFeature.CHAT)).toBe(true);
    });

    it('should return false for disabled features', () => {
      expect(service.hasFeature(RoomFeature.WHITEBOARD)).toBe(false);
      expect(service.hasFeature(RoomFeature.RECORDING)).toBe(false);
    });
  });

  describe('generateToken', () => {
    it('should generate host token when isHost is true', async () => {
      const mockToken = 'host-token';
      livekitService.generateHostToken.mockResolvedValue(mockToken);

      const token = await service.generateToken('user1', 'room1', 'User One', true);

      expect(token).toBe(mockToken);
      expect(livekitService.generateHostToken).toHaveBeenCalled();
    });

    it('should generate participant token when isHost is false', async () => {
      const mockToken = 'participant-token';
      livekitService.generateParticipantToken.mockResolvedValue(mockToken);

      const token = await service.generateToken('user1', 'room1', 'User One', false);

      expect(token).toBe(mockToken);
      expect(livekitService.generateParticipantToken).toHaveBeenCalled();
    });
  });
});
```

---

## ✅ Verification Checklist

After completing Phase 1, verify:

- [ ] All TypeScript files compile without errors
- [ ] All unit tests pass
- [ ] Modules can be imported in app.module.ts
- [ ] No breaking changes to existing code
- [ ] Documentation is complete
- [ ] Code follows project conventions
- [ ] All exports are properly defined in index files

---

## 🚀 Next Steps

After Phase 1 is complete:

1. **Review with team** - Get feedback on abstractions
2. **Update app.module.ts** - Import new modules
3. **Create migration plan** - Plan for Phase 2
4. **Start Phase 2** - Extract feature modules

---

## 📚 Additional Resources

- [NestJS Modules Documentation](https://docs.nestjs.com/modules)
- [TypeScript Abstract Classes](https://www.typescriptlang.org/docs/handbook/2/classes.html#abstract-classes-and-members)
- [Dependency Injection in NestJS](https://docs.nestjs.com/fundamentals/custom-providers)

---

**Created:** 2025-11-27  
**Phase:** 1 - Foundation  
**Status:** 📝 Ready for Implementation
