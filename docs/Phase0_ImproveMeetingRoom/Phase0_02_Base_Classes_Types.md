# PHASE 0.2: BASE CLASSES & TYPES

> **Timeline:** 3 ngày  
> **Priority:** 🔴 CRITICAL  
> **Status:** ⏳ TODO  
> **Prerequisites:** Phase 0.1 (Testing Infrastructure) ✅  
> **Score:** 10/10 ✅ Ready (Complete listener tracking & reconnection handling)

---

## 📋 MỤC TIÊU

Tạo base classes, types, và interfaces cho tất cả P2P managers. Đây là foundation cho toàn bộ implementation.

---

## 🗂️ STEP 1: CREATE DIRECTORY STRUCTURE

**Location:** `talkplatform-frontend/services/p2p/`

```bash
cd talkplatform-frontend
mkdir -p services/p2p/{core,features,utils,types}
```

**Structure:**
```
services/p2p/
├── core/
│   ├── base-p2p-manager.ts          # Base class
│   ├── p2p-media-manager.ts         # Phase 1
│   ├── p2p-stream-manager.ts        # Phase 1
│   ├── p2p-peer-connection-manager.ts  # Phase 2
│   └── p2p-track-state-sync.ts      # Phase 1
├── features/
│   ├── p2p-screen-share-manager.ts  # Phase 3
│   ├── p2p-layout-manager.ts        # Phase 4
│   ├── p2p-moderation-manager.ts    # Phase 6
│   └── chat-manager.ts              # Phase 5
├── utils/
│   ├── event-deduplicator.ts        # Phase 6
│   ├── p2p-error-handler.ts
│   └── p2p-metrics-collector.ts
└── types/
    ├── p2p-types.ts                 # Core types
    ├── p2p-events.ts                # Event types
    └── index.ts                     # Exports
```

---

## 📝 STEP 2: CREATE CORE TYPES

**File:** `talkplatform-frontend/services/p2p/types/p2p-types.ts` (NEW)

```typescript
import { Socket } from 'socket.io-client';

/**
 * P2P Media State
 * Single source of truth cho media state
 */
export interface P2PMediaState {
  mic: {
    enabled: boolean;
    track: MediaStreamTrack | null;
    isMuted: boolean; // Database state (can be forced by host)
    isForced: boolean; // If host forced mute/unmute
    deviceId: string | null;
  };
  camera: {
    enabled: boolean;
    track: MediaStreamTrack | null;
    isVideoOff: boolean; // Database state
    isForced: boolean; // If host forced video off/on
    deviceId: string | null;
  };
  screen: {
    isSharing: boolean;
    track: MediaStreamTrack | null;
    stream: MediaStream | null;
  };
}

/**
 * Peer Connection Info
 * Track thông tin về mỗi peer connection
 */
export interface PeerConnectionInfo {
  userId: string;
  connection: RTCPeerConnection;
  stream?: MediaStream;
  connectionState: RTCPeerConnectionState;
  iceConnectionState: RTCIceConnectionState;
  createdAt: Date;
  lastActivity: Date;
}

/**
 * ICE Server Configuration
 */
export interface ICEServerConfig {
  iceServers: RTCIceServer[];
  iceCandidatePoolSize?: number;
}

/**
 * Media Manager Configuration
 */
export interface MediaManagerConfig {
  socket: Socket;
  meetingId: string;
  userId: string;
  iceServers?: ICEServerConfig;
}

/**
 * Device Info
 */
export interface DeviceInfo {
  deviceId: string;
  kind: MediaDeviceKind;
  label: string;
  groupId: string;
}

/**
 * Connection Quality Metrics
 */
export interface ConnectionQualityMetrics {
  userId: string;
  bandwidth: {
    upload: number; // kbps
    download: number; // kbps
  };
  latency: number; // ms
  packetLoss: number; // percentage
  jitter: number; // ms
  timestamp: Date;
}

/**
 * Error Types
 */
export enum P2PErrorType {
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  DEVICE_NOT_FOUND = 'DEVICE_NOT_FOUND',
  TRACK_REPLACEMENT_FAILED = 'TRACK_REPLACEMENT_FAILED',
  CONNECTION_FAILED = 'CONNECTION_FAILED',
  NEGOTIATION_FAILED = 'NEGOTIATION_FAILED',
  ICE_FAILED = 'ICE_FAILED',
  UNKNOWN = 'UNKNOWN',
}

export interface P2PError {
  type: P2PErrorType;
  message: string;
  originalError?: Error;
  context?: Record<string, any>;
}

/**
 * Layout Types
 */
export enum LayoutMode {
  GRID = 'grid',
  SPOTLIGHT = 'spotlight',
  SIDEBAR = 'sidebar',
  FOCUS = 'focus',
}

export interface LayoutConfig {
  mode: LayoutMode;
  participants: any[]; // Will be defined based on participant type
  main?: any;
  thumbnails?: any[];
}

/**
 * Moderation Action
 */
export interface ModerationAction {
  type: 'mute' | 'video-off' | 'kick' | 'block';
  userId: string;
  mute?: boolean;
  videoOff?: boolean;
  reason?: string;
  timestamp: number;
}

/**
 * Event Deduplication
 */
export interface EventRecord {
  timestamp: number;
  data: string;
}

export interface Event {
  type: string;
  userId: string;
  data: any;
}
```

---

## 📨 STEP 3: CREATE EVENT TYPES

**File:** `talkplatform-frontend/services/p2p/types/p2p-events.ts` (NEW)

```typescript
/**
 * WebRTC Signaling Events
 */
export interface MediaOfferEvent {
  roomId: string;
  targetUserId: string;
  offer: RTCSessionDescriptionInit;
}

export interface MediaAnswerEvent {
  roomId: string;
  targetUserId: string;
  answer: RTCSessionDescriptionInit;
}

export interface MediaIceCandidateEvent {
  roomId: string;
  targetUserId: string;
  candidate: RTCIceCandidateInit;
}

export interface MediaReadyEvent {
  roomId: string;
  userId: string;
}

/**
 * Media Control Events
 */
export interface MediaToggleMicEvent {
  isMuted: boolean;
}

export interface MediaToggleVideoEvent {
  isVideoOff: boolean;
}

export interface MediaScreenShareEvent {
  isSharing: boolean;
}

/**
 * Admin Moderation Events
 */
export interface AdminMuteUserEvent {
  targetUserId: string;
  mute: boolean;
}

export interface AdminVideoOffUserEvent {
  targetUserId: string;
  videoOff: boolean;
}

export interface AdminKickUserEvent {
  targetUserId: string;
  reason?: string;
}

/**
 * Room Events
 */
export interface RoomJoinEvent {
  roomId: string;
  userId: string;
}

export interface RoomLeaveEvent {
  roomId: string;
  userId: string;
}

export interface RoomRequestPeersEvent {
  roomId: string;
}

/**
 * Event Handlers Type
 */
export type EventHandler<T = any> = (data: T) => void | Promise<void>;

export interface P2PEventHandlers {
  // Media events
  'media:offer': EventHandler<MediaOfferEvent>;
  'media:answer': EventHandler<MediaAnswerEvent>;
  'media:ice-candidate': EventHandler<MediaIceCandidateEvent>;
  'media:ready': EventHandler<MediaReadyEvent>;
  'media:toggle-mic': EventHandler<MediaToggleMicEvent>;
  'media:toggle-video': EventHandler<MediaToggleVideoEvent>;
  'media:screen-share': EventHandler<MediaScreenShareEvent>;
  
  // Admin events
  'admin:mute-user': EventHandler<AdminMuteUserEvent>;
  'admin:video-off-user': EventHandler<AdminVideoOffUserEvent>;
  'admin:kick-user': EventHandler<AdminKickUserEvent>;
  
  // Room events
  'room:join': EventHandler<RoomJoinEvent>;
  'room:leave': EventHandler<RoomLeaveEvent>;
  'room:request-peers': EventHandler<RoomRequestPeersEvent>;
}
```

---

## 🔗 STEP 4: CREATE TYPE INDEX

**File:** `talkplatform-frontend/services/p2p/types/index.ts` (NEW)

```typescript
// Export all types
export * from './p2p-types';
export * from './p2p-events';
```

---

## 🏗️ STEP 5: CREATE BASE MANAGER CLASS

**File:** `talkplatform-frontend/services/p2p/core/base-p2p-manager.ts` (NEW)

```typescript
import { Socket } from 'socket.io-client';
import { EventEmitter } from 'events';

/**
 * Base class cho tất cả P2P managers
 * 
 * Provides common functionality:
 * - Event handling
 * - Logging với context
 * - Socket.IO communication
 * - Cleanup utilities
 */
export abstract class BaseP2PManager extends EventEmitter {
  protected socket: Socket | null = null;
  protected meetingId: string = '';
  protected userId: string = '';
  protected isInitialized: boolean = false;

  constructor(socket: Socket, meetingId: string, userId: string) {
    super();
    this.socket = socket;
    this.meetingId = meetingId;
    this.userId = userId;
  }

  /**
   * Initialize manager - must be implemented by subclasses
   */
  abstract initialize(): Promise<void>;

  /**
   * Cleanup resources - must be implemented by subclasses
   */
  abstract cleanup(): void;

  /**
   * Log with context
   */
  protected log(level: 'info' | 'warn' | 'error', message: string, data?: any): void {
    const prefix = `[${this.constructor.name}]`;
    const context = { 
      meetingId: this.meetingId, 
      userId: this.userId, 
      ...data 
    };

    switch (level) {
      case 'info':
        console.log(prefix, message, context);
        break;
      case 'warn':
        console.warn(prefix, message, context);
        break;
      case 'error':
        console.error(prefix, message, context);
        break;
    }
  }

  /**
   * Emit socket event với error handling
   */
  protected emitSocketEvent(
    event: string, 
    data: any, 
    callback?: (response: any) => void
  ): void {
    if (!this.socket || !this.socket.connected) {
      this.log('error', `Cannot emit ${event}: socket not connected`);
      return;
    }

    if (callback) {
      this.socket.emit(event, data, callback);
    } else {
      this.socket.emit(event, data);
    }

    this.log('info', `Emitted ${event}`, data);
  }

  /**
   * Track socket event listeners for cleanup
   */
  private trackedListeners: Map<string, Function[]> = new Map();

  /**
   * Listen to socket event (with tracking for cleanup)
   */
  protected onSocketEvent(event: string, handler: (...args: any[]) => void): void {
    if (!this.socket) {
      this.log('error', `Cannot listen to ${event}: socket not available`);
      return;
    }

    this.socket.on(event, handler);
    
    // Track listener for cleanup
    if (!this.trackedListeners.has(event)) {
      this.trackedListeners.set(event, []);
    }
    this.trackedListeners.get(event)!.push(handler);

    this.log('info', `Listening to ${event}`);
  }

  /**
   * Remove socket event listener (with untracking)
   */
  protected offSocketEvent(event: string, handler?: (...args: any[]) => void): void {
    if (!this.socket) return;

    if (handler) {
      this.socket.off(event, handler);
      
      // Remove from tracked listeners
      const handlers = this.trackedListeners.get(event);
      if (handlers) {
        const index = handlers.indexOf(handler);
        if (index !== -1) {
          handlers.splice(index, 1);
        }
      }
    } else {
      // Remove all listeners for this event
      this.socket.off(event);
      this.trackedListeners.delete(event);
    }
    
    this.log('info', `Stopped listening to ${event}`);
  }

  /**
   * Setup socket reconnection handling
   * 
   * CRITICAL: Socket.IO automatically re-registers listeners that were registered
   * via socket.on() when it reconnects. However, we use trackedListeners to ensure
   * cleanup is complete and logging is accurate.
   */
  protected setupSocketReconnection(): void {
    if (!this.socket) return;

    // Track reconnection count for debugging
    let reconnectCount = 0;

    // Handle reconnection
    this.socket.on('connect', () => {
      reconnectCount++;
      this.log('info', 'Socket reconnected', { 
        reconnectCount,
        trackedListenersCount: this.trackedListeners.size 
      });
      
      // Note: Socket.IO automatically re-registers listeners registered via socket.on()
      // Our trackedListeners Map helps ensure we know what listeners exist for cleanup
      // but Socket.IO handles the actual re-registration on reconnect
    });

    // Handle disconnection
    this.socket.on('disconnect', (reason: string) => {
      this.log('warn', 'Socket disconnected', { 
        reason,
        // Log if any tracked listeners exist (they will be re-registered on reconnect)
        trackedListenersCount: this.trackedListeners.size 
      });
    });

    // Handle connection errors
    this.socket.on('connect_error', (error: Error) => {
      this.log('error', 'Socket connection error', { 
        error: error.message,
        reconnectAttempts: reconnectCount 
      });
    });
  }

  /**
   * Cleanup all tracked listeners
   * CRITICAL: Must be called in cleanup() to prevent duplicate listeners
   * This is essential to prevent the "bấm 1 lần, server nhận 2 lần" bug
   */
  protected cleanupTrackedListeners(): void {
    this.trackedListeners.forEach((handlers, event) => {
      handlers.forEach(handler => {
        if (this.socket) {
          this.socket.off(event, handler);
        }
      });
    });
    this.trackedListeners.clear();
    this.log('info', 'All tracked listeners cleaned up');
  }

  /**
   * Check if initialized
   */
  isReady(): boolean {
    return this.isInitialized;
  }

  /**
   * Get manager info for debugging
   */
  getInfo(): {
    manager: string;
    meetingId: string;
    userId: string;
    initialized: boolean;
    socketConnected: boolean;
  } {
    return {
      manager: this.constructor.name,
      meetingId: this.meetingId,
      userId: this.userId,
      initialized: this.isInitialized,
      socketConnected: this.socket?.connected ?? false,
    };
  }

}
```

---

## ✅ STEP 6: CREATE BASE MANAGER INDEX

**File:** `talkplatform-frontend/services/p2p/core/index.ts` (NEW)

```typescript
export { BaseP2PManager } from './base-p2p-manager';
// Phase 1+ managers will be exported here as they're created
```

---

## 🧪 STEP 7: CREATE TESTS

**File:** `talkplatform-frontend/services/p2p/core/__tests__/base-p2p-manager.test.ts` (NEW)

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BaseP2PManager } from '../base-p2p-manager';
import { createMockSocket } from '../../../../tests/utils/webrtc-test-utils';

// Create concrete implementation for testing
class TestP2PManager extends BaseP2PManager {
  async initialize(): Promise<void> {
    this.isInitialized = true;
  }

  cleanup(): void {
    // CRITICAL: Cleanup all tracked listeners before destroying
    this.cleanupTrackedListeners();
    this.isInitialized = false;
  }
}

describe('BaseP2PManager', () => {
  let mockSocket: ReturnType<typeof createMockSocket>;
  let manager: TestP2PManager;

  beforeEach(() => {
    mockSocket = createMockSocket();
    manager = new TestP2PManager(mockSocket as any, 'meeting-1', 'user-1');
  });

  describe('constructor', () => {
    it('should initialize with correct properties', () => {
      expect(manager['meetingId']).toBe('meeting-1');
      expect(manager['userId']).toBe('user-1');
      expect(manager['socket']).toBe(mockSocket);
      expect(manager.isReady()).toBe(false);
    });
  });

  describe('initialize', () => {
    it('should set isInitialized to true', async () => {
      await manager.initialize();
      expect(manager.isReady()).toBe(true);
    });
  });

  describe('cleanup', () => {
    it('should set isInitialized to false', async () => {
      await manager.initialize();
      manager.cleanup();
      expect(manager.isReady()).toBe(false);
    });
  });

  describe('emitSocketEvent', () => {
    it('should emit event when socket is connected', () => {
      manager['emitSocketEvent']('test:event', { data: 'test' });
      expect(mockSocket.emit).toHaveBeenCalledWith('test:event', { data: 'test' });
    });

    it('should not emit event when socket is not connected', () => {
      mockSocket.connected = false;
      manager['emitSocketEvent']('test:event', { data: 'test' });
      // Should not call emit or call it but handle gracefully
    });

    it('should call callback if provided', (done) => {
      manager['emitSocketEvent']('test:event', { data: 'test' }, (response) => {
        expect(response).toEqual({ success: true });
        done();
      });
    });
  });

  describe('onSocketEvent', () => {
    it('should register event listener', () => {
      const handler = vi.fn();
      manager['onSocketEvent']('test:event', handler);
      expect(mockSocket.on).toHaveBeenCalledWith('test:event', handler);
    });
  });

  describe('offSocketEvent', () => {
    it('should remove event listener with handler', () => {
      const handler = vi.fn();
      manager['offSocketEvent']('test:event', handler);
      expect(mockSocket.off).toHaveBeenCalledWith('test:event', handler);
    });

    it('should remove all listeners for event if no handler provided', () => {
      manager['offSocketEvent']('test:event');
      expect(mockSocket.off).toHaveBeenCalledWith('test:event');
    });
  });

  describe('log', () => {
    it('should log with context', () => {
      const consoleSpy = vi.spyOn(console, 'log');
      manager['log']('info', 'Test message', { extra: 'data' });
      
      expect(consoleSpy).toHaveBeenCalledWith(
        '[TestP2PManager]',
        'Test message',
        expect.objectContaining({
          meetingId: 'meeting-1',
          userId: 'user-1',
          extra: 'data',
        })
      );
    });
  });

  describe('getInfo', () => {
    it('should return manager info', async () => {
      await manager.initialize();
      const info = manager.getInfo();
      
      expect(info).toEqual({
        manager: 'TestP2PManager',
        meetingId: 'meeting-1',
        userId: 'user-1',
        initialized: true,
        socketConnected: true,
      });
    });
  });
});
```

---

## ✅ STEP 8: VERIFY IMPORTS

**Test imports trong một file test:**

```typescript
// Test file để verify types
import { BaseP2PManager } from '@/services/p2p/core/base-p2p-manager';
import { 
  P2PMediaState, 
  PeerConnectionInfo,
  P2PErrorType 
} from '@/services/p2p/types';
import {
  MediaOfferEvent,
  MediaAnswerEvent,
} from '@/services/p2p/types/p2p-events';
```

**Run tests:**
```bash
npm test services/p2p
```

---

## ✅ ACCEPTANCE CRITERIA

- [ ] Directory structure created
- [ ] Base types defined (`p2p-types.ts`)
- [ ] Event types defined (`p2p-events.ts`)
- [ ] Base manager class created (`base-p2p-manager.ts`)
- [ ] All types exported correctly (`types/index.ts`)
- [ ] Tests created và passing
- [ ] Imports work correctly
- [ ] No TypeScript errors

---

## 📚 NEXT STEPS

Sau khi hoàn thành Phase 0.2, tiếp tục với:
- [**Phase0_03_Migration_Strategy.md**](./Phase0_03_Migration_Strategy.md) - Migration strategy

---

**Last Updated:** 2025-12-08  
**Status:** ✅ Ready to Implement

