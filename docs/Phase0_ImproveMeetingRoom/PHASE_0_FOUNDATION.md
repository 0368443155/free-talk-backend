# PHASE 0: FOUNDATION & MIGRATION SETUP

> **Timeline:** 2 tuần (Week 0-1)  
> **Priority:** 🔴 CRITICAL  
> **Status:** ⏳ TODO  
> **Mục đích:** Chuẩn bị infrastructure, testing framework, và migration strategy trước khi implement các phases chính

---

## 📋 MỤC LỤC

1. [Tổng quan](#tổng-quan)
2. [Task 1: Testing Infrastructure Setup](#task-1-testing-infrastructure-setup)
3. [Task 2: Migration Strategy](#task-2-migration-strategy)
4. [Task 3: Base Classes & Interfaces](#task-3-base-classes--interfaces)
5. [Task 4: Architecture Documentation](#task-4-architecture-documentation)
6. [Task 5: Monitoring & Metrics Setup](#task-5-monitoring--metrics-setup)
7. [Acceptance Criteria](#acceptance-criteria)

---

## 🎯 TỔNG QUAN

### Vấn đề hiện tại

**Từ codebase analysis:**

1. **Không có testing infrastructure cho P2P WebRTC**
   - `package.json` không có test scripts
   - Không có testing libraries (Jest, Vitest, Testing Library)
   - Không có test files cho WebRTC components

2. **Dual gateway system cần migration plan**
   - `meetings.gateway.ts` (deprecated) - Old events: `webrtc:*`, `toggle-*`
   - `enhanced-meetings.gateway.ts` (new) - LiveKit-focused
   - Feature flag `use_new_gateway` đã có nhưng chưa được sử dụng đầy đủ
   - `EVENT_MIGRATION_MAP.md` đã có nhưng chưa complete

3. **Thiếu base classes cho P2P managers**
   - `services/` directory chỉ có `api/` subdirectory
   - Chưa có structure cho P2P services
   - Chưa có shared types và interfaces

4. **Thiếu documentation**
   - Không có architecture diagrams
   - Không có sequence diagrams cho WebRTC flows
   - Không có API documentation

### Mục tiêu Phase 0

✅ Setup testing infrastructure hoàn chỉnh  
✅ Tạo migration strategy rõ ràng từ old gateway sang new events  
✅ Tạo base classes và interfaces cho tất cả P2P managers  
✅ Document architecture và flows  
✅ Setup monitoring và metrics foundation  

---

## 📦 TASK 1: TESTING INFRASTRUCTURE SETUP

**Timeline:** 3-4 ngày  
**Priority:** 🔴 CRITICAL

### 1.1. Install Testing Dependencies

**File:** `talkplatform-frontend/package.json`

```json
{
  "devDependencies": {
    // Existing
    "@types/node": "^20",
    "@types/react": "^19",
    "@types/react-dom": "^19",
    "typescript": "^5",
    
    // NEW: Testing libraries
    "@testing-library/react": "^14.1.2",
    "@testing-library/jest-dom": "^6.1.5",
    "@testing-library/user-event": "^14.5.1",
    "vitest": "^1.0.4",
    "@vitest/ui": "^1.0.4",
    "jsdom": "^23.0.1",
    
    // NEW: WebRTC mocking
    "mock-socket": "^9.3.1",
    "@types/mock-socket": "^9.0.8"
  },
  "scripts": {
    "dev": "next dev --port 3001",
    "build": "next build",
    "start": "next start --port 3001",
    "lint": "next lint",
    "type-check": "tsc --noEmit",
    
    // NEW: Test scripts
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest --coverage",
    "test:watch": "vitest --watch"
  }
}
```

**Action Items:**
```bash
# Install dependencies
cd talkplatform-frontend
npm install --save-dev @testing-library/react @testing-library/jest-dom @testing-library/user-event vitest @vitest/ui jsdom mock-socket @types/mock-socket
```

### 1.2. Create Vitest Configuration

**File:** `talkplatform-frontend/vitest.config.ts` (NEW)

```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'tests/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/mockData',
        '**/*.test.{ts,tsx}',
      ],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
});
```

### 1.3. Create Test Setup File

**File:** `talkplatform-frontend/tests/setup.ts` (NEW)

```typescript
import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Mock WebRTC APIs
global.RTCPeerConnection = vi.fn().mockImplementation(() => ({
  createOffer: vi.fn(),
  createAnswer: vi.fn(),
  setLocalDescription: vi.fn(),
  setRemoteDescription: vi.fn(),
  addIceCandidate: vi.fn(),
  addTrack: vi.fn(),
  removeTrack: vi.fn(),
  getSenders: vi.fn(() => []),
  getReceivers: vi.fn(() => []),
  close: vi.fn(),
  restartIce: vi.fn(),
  connectionState: 'new',
  signalingState: 'stable',
  iceConnectionState: 'new',
  onicecandidate: null,
  ontrack: null,
  onconnectionstatechange: null,
  onnegotiationneeded: null,
})) as any;

global.RTCSessionDescription = vi.fn() as any;
global.RTCIceCandidate = vi.fn() as any;

// Mock MediaStream
global.MediaStream = vi.fn().mockImplementation(() => ({
  getTracks: vi.fn(() => []),
  getAudioTracks: vi.fn(() => []),
  getVideoTracks: vi.fn(() => []),
  addTrack: vi.fn(),
  removeTrack: vi.fn(),
  active: true,
  id: 'mock-stream-id',
})) as any;

// Mock MediaStreamTrack
const mockMediaStreamTrack = {
  kind: 'video',
  id: 'mock-track-id',
  label: 'mock-track',
  enabled: true,
  readyState: 'live',
  stop: vi.fn(),
  getSettings: vi.fn(() => ({ deviceId: 'mock-device-id' })),
  onended: null,
};

// Mock getUserMedia
global.navigator.mediaDevices = {
  getUserMedia: vi.fn().mockResolvedValue({
    getTracks: () => [mockMediaStreamTrack],
    getAudioTracks: () => [{ ...mockMediaStreamTrack, kind: 'audio' }],
    getVideoTracks: () => [{ ...mockMediaStreamTrack, kind: 'video' }],
    addTrack: vi.fn(),
    removeTrack: vi.fn(),
    active: true,
    id: 'mock-stream-id',
  }),
  getDisplayMedia: vi.fn().mockResolvedValue({
    getTracks: () => [mockMediaStreamTrack],
    getVideoTracks: () => [mockMediaStreamTrack],
    addTrack: vi.fn(),
    removeTrack: vi.fn(),
    active: true,
    id: 'mock-screen-stream-id',
  }),
  enumerateDevices: vi.fn().mockResolvedValue([
    { deviceId: 'camera-1', kind: 'videoinput', label: 'Camera 1' },
    { deviceId: 'mic-1', kind: 'audioinput', label: 'Microphone 1' },
  ]),
} as any;

// Mock Socket.IO
vi.mock('socket.io-client', () => ({
  io: vi.fn(() => ({
    on: vi.fn(),
    off: vi.fn(),
    emit: vi.fn(),
    connect: vi.fn(),
    disconnect: vi.fn(),
    connected: true,
  })),
}));
```

### 1.4. Create Test Utilities

**File:** `talkplatform-frontend/tests/utils/webrtc-test-utils.ts` (NEW)

```typescript
import { vi } from 'vitest';

/**
 * Create mock RTCPeerConnection for testing
 */
export function createMockPeerConnection(): RTCPeerConnection {
  const mockPC = {
    createOffer: vi.fn().mockResolvedValue({ type: 'offer', sdp: 'mock-sdp' }),
    createAnswer: vi.fn().mockResolvedValue({ type: 'answer', sdp: 'mock-sdp' }),
    setLocalDescription: vi.fn().mockResolvedValue(undefined),
    setRemoteDescription: vi.fn().mockResolvedValue(undefined),
    addIceCandidate: vi.fn().mockResolvedValue(undefined),
    addTrack: vi.fn(),
    removeTrack: vi.fn(),
    getSenders: vi.fn(() => []),
    getReceivers: vi.fn(() => []),
    close: vi.fn(),
    restartIce: vi.fn(),
    connectionState: 'new',
    signalingState: 'stable',
    iceConnectionState: 'new',
    onicecandidate: null,
    ontrack: null,
    onconnectionstatechange: null,
    onnegotiationneeded: null,
    localDescription: null,
    remoteDescription: null,
  } as unknown as RTCPeerConnection;

  return mockPC;
}

/**
 * Create mock MediaStream for testing
 */
export function createMockMediaStream(options?: {
  hasAudio?: boolean;
  hasVideo?: boolean;
}): MediaStream {
  const { hasAudio = true, hasVideo = true } = options || {};

  const audioTrack = {
    kind: 'audio',
    id: 'mock-audio-track',
    label: 'Mock Audio',
    enabled: true,
    readyState: 'live',
    stop: vi.fn(),
    getSettings: vi.fn(() => ({ deviceId: 'mock-audio-device' })),
  } as unknown as MediaStreamTrack;

  const videoTrack = {
    kind: 'video',
    id: 'mock-video-track',
    label: 'Mock Video',
    enabled: true,
    readyState: 'live',
    stop: vi.fn(),
    getSettings: vi.fn(() => ({ deviceId: 'mock-video-device' })),
  } as unknown as MediaStreamTrack;

  const tracks: MediaStreamTrack[] = [];
  if (hasAudio) tracks.push(audioTrack);
  if (hasVideo) tracks.push(videoTrack);

  return {
    getTracks: () => tracks,
    getAudioTracks: () => hasAudio ? [audioTrack] : [],
    getVideoTracks: () => hasVideo ? [videoTrack] : [],
    addTrack: vi.fn(),
    removeTrack: vi.fn(),
    active: true,
    id: 'mock-stream-id',
  } as unknown as MediaStream;
}

/**
 * Create mock Socket.IO client for testing
 */
export function createMockSocket() {
  const eventHandlers = new Map<string, Function>();

  return {
    on: vi.fn((event: string, handler: Function) => {
      eventHandlers.set(event, handler);
    }),
    off: vi.fn((event: string) => {
      eventHandlers.delete(event);
    }),
    emit: vi.fn(),
    connect: vi.fn(),
    disconnect: vi.fn(),
    connected: true,
    // Helper to trigger events in tests
    _trigger: (event: string, data: any) => {
      const handler = eventHandlers.get(event);
      if (handler) handler(data);
    },
  };
}

/**
 * Wait for async operations to complete
 */
export function waitForAsync(ms: number = 0): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Simulate peer connection state change
 */
export function simulateConnectionStateChange(
  pc: RTCPeerConnection,
  state: RTCPeerConnectionState
): void {
  (pc as any).connectionState = state;
  if (pc.onconnectionstatechange) {
    pc.onconnectionstatechange(new Event('connectionstatechange'));
  }
}

/**
 * Simulate ICE candidate event
 */
export function simulateIceCandidate(
  pc: RTCPeerConnection,
  candidate: RTCIceCandidateInit | null
): void {
  if (pc.onicecandidate) {
    const event = {
      candidate: candidate ? new RTCIceCandidate(candidate) : null,
    } as RTCPeerConnectionIceEvent;
    pc.onicecandidate(event);
  }
}
```

### 1.5. Create Example Test

**File:** `talkplatform-frontend/hooks/__tests__/use-webrtc.test.ts` (NEW)

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useWebRTC } from '../use-webrtc';
import { createMockSocket, createMockMediaStream, waitForAsync } from '../../tests/utils/webrtc-test-utils';

describe('useWebRTC', () => {
  let mockSocket: ReturnType<typeof createMockSocket>;

  beforeEach(() => {
    mockSocket = createMockSocket();
    vi.clearAllMocks();
  });

  describe('startLocalStream', () => {
    it('should request user media and set local stream', async () => {
      const { result } = renderHook(() =>
        useWebRTC({
          socket: mockSocket as any,
          meetingId: 'test-meeting',
          userId: 'test-user',
          isOnline: true,
        })
      );

      expect(result.current.localStream).toBeNull();

      await act(async () => {
        await result.current.startLocalStream();
      });

      await waitFor(() => {
        expect(result.current.localStream).not.toBeNull();
      });

      expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user',
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
    });

    it('should emit webrtc:ready event after getting stream', async () => {
      const { result } = renderHook(() =>
        useWebRTC({
          socket: mockSocket as any,
          meetingId: 'test-meeting',
          userId: 'test-user',
          isOnline: true,
        })
      );

      await act(async () => {
        await result.current.startLocalStream();
      });

      await waitFor(() => {
        expect(mockSocket.emit).toHaveBeenCalledWith('webrtc:ready', {
          userId: 'test-user',
        });
      });
    });
  });

  describe('toggleMute', () => {
    it('should toggle audio track enabled state', async () => {
      const { result } = renderHook(() =>
        useWebRTC({
          socket: mockSocket as any,
          meetingId: 'test-meeting',
          userId: 'test-user',
          isOnline: true,
        })
      );

      await act(async () => {
        await result.current.startLocalStream();
      });

      expect(result.current.isMuted).toBe(false);

      act(() => {
        result.current.toggleMute();
      });

      expect(result.current.isMuted).toBe(true);
      expect(mockSocket.emit).toHaveBeenCalledWith('toggle-audio', {
        enabled: false,
      });
    });
  });

  // TODO: Add more tests for:
  // - toggleVideo
  // - toggleScreenShare
  // - peer connection creation
  // - offer/answer handling
  // - ICE candidate handling
});
```

---

## 🔄 TASK 2: MIGRATION STRATEGY

**Timeline:** 2-3 ngày  
**Priority:** 🔴 CRITICAL

### 2.1. Analyze Current Gateway State

**Hiện trạng từ codebase:**

1. **Old Gateway:** `meetings.gateway.ts` (885 lines)
   - Events: `webrtc:*`, `toggle-*`, `admin:*`, `chat:*`, `youtube:*`, `hand:*`
   - Status: Deprecated nhưng vẫn đang active
   - Comment: `@deprecated This gateway is deprecated. Please use UnifiedRoomGateway`

2. **New Gateway:** `enhanced-meetings.gateway.ts` (562 lines)
   - Focus: LiveKit integration + Waiting Room
   - Events: `waiting-room:*`, `livekit:*`
   - Chưa có P2P WebRTC events

3. **Feature Flag:** `use_new_gateway`
   - Đã có trong `use-webrtc.ts` (line 52)
   - Đang được sử dụng để switch giữa old và new events
   - Service: `FeatureFlagService` đã có sẵn

4. **Event Migration Map:** `docs/after_refactor/EVENT_MIGRATION_MAP.md`
   - Đã có mapping chi tiết
   - Status: Một số events đã DONE, một số TODO

### 2.2. Create Migration Plan Document

**File:** `docs/P2P_MIGRATION_STRATEGY.md` (NEW)

```markdown
# P2P WebRTC Migration Strategy

> **Mục đích:** Migration từ old gateway sang new P2P-focused gateway  
> **Timeline:** 4 tuần  
> **Approach:** Gradual rollout với feature flags

---

## 🎯 MIGRATION GOALS

1. ✅ Maintain backward compatibility (zero downtime)
2. ✅ Gradual rollout với feature flags
3. ✅ Separate P2P WebRTC từ LiveKit logic
4. ✅ Clean up deprecated code sau khi migration complete

---

## 📊 CURRENT STATE

### Gateway Architecture

```
meetings.gateway.ts (DEPRECATED)
├── WebRTC Signaling (webrtc:*)
├── Media Controls (toggle-*)
├── Admin Moderation (admin:*)
├── Chat (chat:*)
├── YouTube Sync (youtube:*)
└── Hand Raise (hand:*)

enhanced-meetings.gateway.ts (LIVEKIT-FOCUSED)
├── Waiting Room (waiting-room:*)
└── LiveKit Data Channel (livekit:*)

PROPOSED: p2p-webrtc.gateway.ts (NEW)
├── WebRTC Signaling (media:offer, media:answer, media:ice-candidate)
├── Media Controls (media:toggle-mic, media:toggle-video, media:screen-share)
├── Peer Management (media:ready, room:request-peers)
└── Admin Moderation (admin:mute-user, admin:video-off-user)
```

### Feature Flag Strategy

```typescript
// Frontend: use-webrtc.ts
const useNewGateway = useFeatureFlag('use_new_gateway'); // Already exists

// Backend: Feature flag service
await this.featureFlagService.isEnabled('use_new_gateway');
```

---

## 🚀 MIGRATION PHASES

### Phase 1: Create New P2P Gateway (Week 1)

**File:** `talkplatform-backend/src/features/meeting/p2p-webrtc.gateway.ts` (NEW)

```typescript
@WebSocketGateway({
  cors: {
    origin: ['http://localhost:3000', 'http://localhost:3001'],
    credentials: true,
  },
  namespace: '/meetings',
})
export class P2PWebRTCGateway implements OnGatewayConnection, OnGatewayDisconnect {
  // Implement P2P WebRTC events
  
  @SubscribeMessage('media:offer')
  async handleOffer(...) { }
  
  @SubscribeMessage('media:answer')
  async handleAnswer(...) { }
  
  @SubscribeMessage('media:ice-candidate')
  async handleIceCandidate(...) { }
  
  @SubscribeMessage('media:ready')
  async handleReady(...) { }
  
  @SubscribeMessage('media:toggle-mic')
  async handleToggleMic(...) { }
  
  @SubscribeMessage('media:toggle-video')
  async handleToggleVideo(...) { }
  
  @SubscribeMessage('media:screen-share')
  async handleScreenShare(...) { }
}
```

### Phase 2: Dual Gateway Support (Week 2)

**Update:** `meetings.gateway.ts`

```typescript
@SubscribeMessage('webrtc:offer')
async handleWebRTCOffer(...) {
  // Check feature flag
  const useNewGateway = await this.featureFlagService.isEnabled('use_new_gateway');
  
  if (useNewGateway) {
    // Forward to new gateway
    return this.p2pGateway.handleOffer(...);
  }
  
  // Old implementation (keep for backward compatibility)
  // ...existing code...
}
```

**Update:** `use-webrtc.ts`

```typescript
// Already has feature flag support (line 52)
const useNewGateway = useFeatureFlag('use_new_gateway');

// Emit events based on flag (already implemented lines 90-94, 153-157, etc.)
if (useNewGateway) {
  socket.emit('media:ready', { roomId: meetingId, userId });
} else {
  socket.emit('webrtc:ready', { userId });
}
```

### Phase 3: Gradual Rollout (Week 3)

**Rollout Plan:**

```
Day 1-2: Internal testing (10% users)
Day 3-4: Beta users (25% users)
Day 5-6: Gradual increase (50% users)
Day 7: Full rollout (100% users)
```

**Feature Flag Configuration:**

```typescript
// Database: feature_flags table
{
  name: 'use_new_gateway',
  enabled: true,
  rollout_percentage: 10, // Start with 10%
  target_users: ['beta-user-1', 'beta-user-2'], // Optional
}
```

### Phase 4: Cleanup (Week 4)

**Remove old code:**

1. Remove old event handlers từ `meetings.gateway.ts`
2. Remove feature flag checks
3. Update documentation
4. Remove deprecated comments

---

## ✅ ACCEPTANCE CRITERIA

### Phase 1: New Gateway
- [ ] P2P WebRTC gateway created
- [ ] All events implemented
- [ ] Unit tests pass
- [ ] Integration tests pass

### Phase 2: Dual Support
- [ ] Feature flag working
- [ ] Both old and new events work
- [ ] No breaking changes
- [ ] Backward compatibility verified

### Phase 3: Rollout
- [ ] 10% rollout successful
- [ ] No errors in production
- [ ] Metrics look good
- [ ] 100% rollout complete

### Phase 4: Cleanup
- [ ] Old code removed
- [ ] Documentation updated
- [ ] Code review complete
- [ ] Production stable

---

## 📝 TESTING STRATEGY

### Unit Tests
```typescript
describe('P2PWebRTCGateway', () => {
  it('should handle media:offer event', async () => {
    // Test offer handling
  });
  
  it('should forward offer to target user', async () => {
    // Test peer-to-peer forwarding
  });
});
```

### Integration Tests
```typescript
describe('Gateway Migration', () => {
  it('should work with old events when flag is off', async () => {
    // Test backward compatibility
  });
  
  it('should work with new events when flag is on', async () => {
    // Test new implementation
  });
});
```

### E2E Tests
```typescript
describe('Meeting Room E2E', () => {
  it('should connect peers using new gateway', async () => {
    // Test full flow
  });
});
```

---

**Last Updated:** 2025-12-08
```

### 2.3. Update Event Migration Map

**File:** `docs/after_refactor/EVENT_MIGRATION_MAP.md` (UPDATE)

Thêm section mới:

```markdown
## 🔄 P2P WebRTC Events (NEW - Phase 0)

### WebRTC Signaling Events

| Old Event | New Event | Gateway | Payload Changes | Status |
|-----------|-----------|---------|-----------------|--------|
| `webrtc:offer` | `media:offer` | P2PWebRTCGateway | Add `roomId` | ⏳ TODO |
| `webrtc:answer` | `media:answer` | P2PWebRTCGateway | Add `roomId` | ⏳ TODO |
| `webrtc:ice-candidate` | `media:ice-candidate` | P2PWebRTCGateway | Add `roomId` | ⏳ TODO |
| `webrtc:ready` | `media:ready` | P2PWebRTCGateway | Add `roomId` | ⏳ TODO |

### Media Control Events

| Old Event | New Event | Gateway | Status |
|-----------|-----------|---------|--------|
| `toggle-audio` | `media:toggle-mic` | P2PWebRTCGateway | ✅ DONE (frontend) |
| `toggle-video` | `media:toggle-video` | P2PWebRTCGateway | ✅ DONE (frontend) |
| `screen-share` | `media:screen-share` | P2PWebRTCGateway | ✅ DONE (frontend) |

### Peer Management Events

| Old Event | New Event | Gateway | Status |
|-----------|-----------|---------|--------|
| `meeting:request-peers` | `room:request-peers` | P2PWebRTCGateway | ⏳ TODO |
| `meeting:user-left` | `room:user-left` | P2PWebRTCGateway | ✅ DONE |
```

---

## 🏗️ TASK 3: BASE CLASSES & INTERFACES

**Timeline:** 2-3 ngày  
**Priority:** 🔴 CRITICAL

### 3.1. Create Directory Structure

```
talkplatform-frontend/
├── services/
│   ├── api/                          # EXISTING
│   └── p2p/                          # NEW
│       ├── core/
│       │   ├── p2p-media-manager.ts
│       │   ├── p2p-stream-manager.ts
│       │   ├── p2p-peer-connection-manager.ts
│       │   └── p2p-track-state-sync.ts
│       ├── features/
│       │   ├── p2p-screen-share-manager.ts
│       │   ├── p2p-layout-manager.ts
│       │   ├── p2p-moderation-manager.ts
│       │   └── chat-manager.ts
│       ├── utils/
│       │   ├── event-deduplicator.ts
│       │   ├── p2p-error-handler.ts
│       │   └── p2p-metrics-collector.ts
│       └── types/
│           ├── p2p-types.ts
│           ├── p2p-events.ts
│           └── index.ts
```

### 3.2. Create Base Types

**File:** `talkplatform-frontend/services/p2p/types/p2p-types.ts` (NEW)

```typescript
import { Socket } from 'socket.io-client';

/**
 * P2P Media State
 */
export interface P2PMediaState {
  mic: {
    enabled: boolean;
    track: MediaStreamTrack | null;
    isMuted: boolean; // Database state
    isForced: boolean; // If host forced mute
    deviceId: string | null;
  };
  camera: {
    enabled: boolean;
    track: MediaStreamTrack | null;
    isVideoOff: boolean; // Database state
    isForced: boolean; // If host forced video off
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

### 3.3. Create Base Event Types

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

### 3.4. Create Base Manager Class

**File:** `talkplatform-frontend/services/p2p/core/base-p2p-manager.ts` (NEW)

```typescript
import { Socket } from 'socket.io-client';
import { EventEmitter } from 'events';

/**
 * Base class cho tất cả P2P managers
 * Provides common functionality: event handling, logging, cleanup
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
    const context = { meetingId: this.meetingId, userId: this.userId, ...data };

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
   * Emit socket event with error handling
   */
  protected emitSocketEvent(event: string, data: any, callback?: (response: any) => void): void {
    if (!this.socket || !this.socket.connected) {
      this.log('error', `Cannot emit ${event}: socket not connected`);
      return;
    }

    this.socket.emit(event, data, callback);
    this.log('info', `Emitted ${event}`, data);
  }

  /**
   * Listen to socket event
   */
  protected onSocketEvent(event: string, handler: (...args: any[]) => void): void {
    if (!this.socket) {
      this.log('error', `Cannot listen to ${event}: socket not available`);
      return;
    }

    this.socket.on(event, handler);
    this.log('info', `Listening to ${event}`);
  }

  /**
   * Remove socket event listener
   */
  protected offSocketEvent(event: string, handler?: (...args: any[]) => void): void {
    if (!this.socket) return;

    if (handler) {
      this.socket.off(event, handler);
    } else {
      this.socket.off(event);
    }
    this.log('info', `Stopped listening to ${event}`);
  }

  /**
   * Check if initialized
   */
  isReady(): boolean {
    return this.isInitialized;
  }
}
```

---

## 📚 TASK 4: ARCHITECTURE DOCUMENTATION

**Timeline:** 1-2 ngày  
**Priority:** 🟠 HIGH

### 4.1. Create Architecture Overview

**File:** `docs/P2P_ARCHITECTURE.md` (NEW)

```markdown
# P2P WebRTC Architecture

> **Version:** 1.0  
> **Last Updated:** 2025-12-08  
> **Focus:** P2P Mesh Topology for Meeting Room

---

## 🏗️ ARCHITECTURE OVERVIEW

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (React/Next.js)                 │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────────────────────────────────────────────┐  │
│  │           Meeting Room Component                      │  │
│  │  - UI Controls                                        │  │
│  │  - Video Grid                                         │  │
│  │  - Chat Panel                                         │  │
│  │  - Participants Panel                                 │  │
│  └──────────────────────────────────────────────────────┘  │
│                          │                                   │
│                          ▼                                   │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              use-webrtc Hook                          │  │
│  │  - Orchestrates all P2P managers                     │  │
│  │  - Manages hook state                                │  │
│  └──────────────────────────────────────────────────────┘  │
│                          │                                   │
│                          ▼                                   │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              P2P Manager Layer                        │  │
│  │  ┌────────────────────────────────────────────────┐  │  │
│  │  │  P2PMediaManager                               │  │  │
│  │  │  - Mic/Camera control                          │  │  │
│  │  │  - Device management                           │  │  │
│  │  │  - State sync                                  │  │  │
│  │  └────────────────────────────────────────────────┘  │  │
│  │  ┌────────────────────────────────────────────────┐  │  │
│  │  │  P2PPeerConnectionManager                      │  │  │
│  │  │  - Peer connections                            │  │  │
│  │  │  - Negotiation                                 │  │  │
│  │  │  - ICE handling                                │  │  │
│  │  └────────────────────────────────────────────────┘  │  │
│  │  ┌────────────────────────────────────────────────┐  │  │
│  │  │  P2PScreenShareManager                         │  │  │
│  │  │  - Screen capture                              │  │  │
│  │  │  - Camera restoration                          │  │  │
│  │  └────────────────────────────────────────────────┘  │  │
│  └──────────────────────────────────────────────────────┘  │
│                          │                                   │
│                          ▼                                   │
│  ┌──────────────────────────────────────────────────────┐  │
│  │           Socket.IO Client                            │  │
│  │  - Signaling                                          │  │
│  │  - Event handling                                     │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                          │
                          │ WebSocket
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                   Backend (NestJS)                           │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────────────────┐  │
│  │         P2PWebRTCGateway (Socket.IO)                  │  │
│  │  - WebRTC signaling relay                            │  │
│  │  - Media state management                            │  │
│  │  - Admin moderation                                  │  │
│  └──────────────────────────────────────────────────────┘  │
│                          │                                   │
│                          ▼                                   │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              Database (PostgreSQL)                    │  │
│  │  - Meeting state                                      │  │
│  │  - Participant state                                  │  │
│  │  - Chat messages                                      │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                  P2P Mesh Topology                           │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│     Peer A ←──────────────────────────────→ Peer B          │
│       │  \                                  /  │             │
│       │    \                              /    │             │
│       │      \                          /      │             │
│       │        \                      /        │             │
│       │          \                  /          │             │
│       │            \              /            │             │
│       │              \          /              │             │
│       ↓                \      /                ↓             │
│     Peer C ←────────────\  /──────────────→ Peer D          │
│                           \/                                 │
│                           /\                                 │
│                          /  \                                │
│                                                               │
│  Each peer maintains direct RTCPeerConnection to all others  │
└─────────────────────────────────────────────────────────────┘
```

### Technology Stack

- **Frontend:** React 19, Next.js 15, TypeScript 5
- **WebRTC:** Native WebRTC APIs (RTCPeerConnection)
- **Signaling:** Socket.IO Client 4.8
- **Backend:** NestJS, Socket.IO Server
- **Database:** PostgreSQL (TypeORM)

---

## 🔄 DATA FLOW

### 1. Peer Connection Establishment

```
User A                    Backend                    User B
  │                          │                          │
  │  1. Join meeting         │                          │
  ├─────────────────────────►│                          │
  │  socket.emit('room:join')│                          │
  │                          │                          │
  │  2. Get existing peers   │                          │
  │◄─────────────────────────┤                          │
  │  'room:peers-list'       │                          │
  │                          │                          │
  │  3. Create offer         │                          │
  │  pc.createOffer()        │                          │
  │                          │                          │
  │  4. Send offer           │                          │
  ├─────────────────────────►│  5. Forward offer        │
  │  'media:offer'           ├─────────────────────────►│
  │                          │                          │
  │                          │  6. Create answer        │
  │                          │  pc.createAnswer()       │
  │                          │                          │
  │  8. Receive answer       │  7. Send answer          │
  │◄─────────────────────────┤◄─────────────────────────┤
  │  'media:answer'          │                          │
  │                          │                          │
  │  9. ICE candidates       │  10. ICE candidates      │
  │◄────────────────────────►│◄────────────────────────►│
  │  'media:ice-candidate'   │                          │
  │                          │                          │
  │  11. Connection established                         │
  │◄═══════════════════════════════════════════════════►│
  │         RTCPeerConnection (P2P)                     │
  │                                                      │
  │  12. Media streams flowing                          │
  │◄═══════════════════════════════════════════════════►│
```

### 2. Media Control Flow

```
User                    MediaManager              Backend
  │                          │                       │
  │  1. Toggle mic           │                       │
  ├─────────────────────────►│                       │
  │  toggleMute()            │                       │
  │                          │                       │
  │                          │  2. Update track      │
  │                          │  audioTrack.enabled   │
  │                          │                       │
  │                          │  3. Sync to DB        │
  │                          ├──────────────────────►│
  │                          │  'media:toggle-mic'   │
  │                          │                       │
  │                          │  4. Broadcast         │
  │◄─────────────────────────┤◄──────────────────────┤
  │  'user-mic-changed'      │                       │
  │                          │                       │
  │  5. UI update            │                       │
  │  (mic icon)              │                       │
```

---

## 📦 COMPONENT DETAILS

### P2PMediaManager

**Responsibilities:**
- Manage microphone and camera state
- Handle device switching
- Sync state with database
- Track replacement in peer connections

**Key Methods:**
```typescript
enableMicrophone(enabled: boolean): Promise<void>
enableCamera(enabled: boolean, deviceId?: string): Promise<void>
switchDevice(kind: 'audio' | 'video', deviceId: string): Promise<void>
forceMicrophoneState(muted: boolean): Promise<void>
forceCameraState(videoOff: boolean): Promise<void>
```

### P2PPeerConnectionManager

**Responsibilities:**
- Create and manage RTCPeerConnections
- Handle negotiation with queue
- Process ICE candidates
- Connection recovery

**Key Methods:**
```typescript
createPeerConnection(userId: string): RTCPeerConnection
handleNegotiationNeeded(userId: string): Promise<void>
handleIceCandidate(userId: string, candidate: RTCIceCandidateInit): void
processPendingCandidates(userId: string): Promise<void>
closePeerConnection(userId: string): void
```

### P2PScreenShareManager

**Responsibilities:**
- Start/stop screen sharing
- Camera restoration
- Browser compatibility checks

**Key Methods:**
```typescript
startScreenShare(): Promise<void>
stopScreenShare(options?: { restoreCamera?: boolean }): Promise<void>
isScreenShareSupported(): boolean
```

---

## 🔐 SECURITY CONSIDERATIONS

1. **STUN/TURN Servers**
   - Use Google STUN servers for ICE
   - TODO: Add TURN servers for NAT traversal

2. **Signaling Security**
   - JWT authentication for Socket.IO
   - Room access validation

3. **Media Permissions**
   - Request permissions explicitly
   - Handle permission denied gracefully

---

**Last Updated:** 2025-12-08
```

### 4.2. Create Sequence Diagrams

**File:** `docs/P2P_SEQUENCE_DIAGRAMS.md` (NEW)

[Content tương tự với sequence diagrams chi tiết cho các flows]

---

## 📊 TASK 5: MONITORING & METRICS SETUP

**Timeline:** 1 ngày  
**Priority:** 🟡 MEDIUM

### 5.1. Create Metrics Collector

**File:** `talkplatform-frontend/services/p2p/utils/p2p-metrics-collector.ts` (NEW)

```typescript
import { ConnectionQualityMetrics } from '../types/p2p-types';

/**
 * Collect and report P2P connection metrics
 */
export class P2PMetricsCollector {
  private metricsInterval: NodeJS.Timeout | null = null;
  private readonly COLLECTION_INTERVAL = 5000; // 5 seconds

  constructor(private meetingId: string, private userId: string) {}

  /**
   * Start collecting metrics
   */
  start(peerConnections: Map<string, RTCPeerConnection>): void {
    this.metricsInterval = setInterval(async () => {
      for (const [userId, pc] of peerConnections.entries()) {
        const metrics = await this.collectConnectionStats(pc, userId);
        this.reportMetrics(metrics);
      }
    }, this.COLLECTION_INTERVAL);
  }

  /**
   * Stop collecting metrics
   */
  stop(): void {
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
      this.metricsInterval = null;
    }
  }

  /**
   * Collect connection statistics
   */
  async collectConnectionStats(
    pc: RTCPeerConnection,
    userId: string
  ): Promise<ConnectionQualityMetrics> {
    const stats = await pc.getStats();
    
    let uploadBandwidth = 0;
    let downloadBandwidth = 0;
    let latency = 0;
    let packetLoss = 0;
    let jitter = 0;

    stats.forEach((report) => {
      if (report.type === 'outbound-rtp') {
        uploadBandwidth = report.bytesSent || 0;
      } else if (report.type === 'inbound-rtp') {
        downloadBandwidth = report.bytesReceived || 0;
        jitter = report.jitter || 0;
        packetLoss = this.calculatePacketLoss(report);
      } else if (report.type === 'candidate-pair' && report.state === 'succeeded') {
        latency = report.currentRoundTripTime || 0;
      }
    });

    return {
      userId,
      bandwidth: {
        upload: uploadBandwidth / 1000, // Convert to kbps
        download: downloadBandwidth / 1000,
      },
      latency: latency * 1000, // Convert to ms
      packetLoss,
      jitter: jitter * 1000, // Convert to ms
      timestamp: new Date(),
    };
  }

  /**
   * Calculate packet loss percentage
   */
  private calculatePacketLoss(report: any): number {
    const packetsLost = report.packetsLost || 0;
    const packetsReceived = report.packetsReceived || 0;
    const totalPackets = packetsLost + packetsReceived;
    
    if (totalPackets === 0) return 0;
    
    return (packetsLost / totalPackets) * 100;
  }

  /**
   * Report metrics to analytics
   */
  private reportMetrics(metrics: ConnectionQualityMetrics): void {
    // TODO: Send to analytics service
    console.log('[Metrics]', metrics);
    
    // Emit event for UI display
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('p2p-metrics', { detail: metrics }));
    }
  }
}
```

---

## ✅ ACCEPTANCE CRITERIA

### Task 1: Testing Infrastructure
- [ ] Vitest installed and configured
- [ ] Test setup file created with WebRTC mocks
- [ ] Test utilities created
- [ ] Example test passes
- [ ] `npm test` command works

### Task 2: Migration Strategy
- [ ] Migration plan document created
- [ ] Event migration map updated
- [ ] Feature flag strategy defined
- [ ] Rollout plan documented
- [ ] Testing strategy defined

### Task 3: Base Classes
- [ ] Directory structure created
- [ ] Base types defined
- [ ] Event types defined
- [ ] Base manager class created
- [ ] All types exported correctly

### Task 4: Documentation
- [ ] Architecture overview created
- [ ] Component diagrams added
- [ ] Sequence diagrams created
- [ ] Security considerations documented
- [ ] API documentation started

### Task 5: Monitoring
- [ ] Metrics collector created
- [ ] Stats collection working
- [ ] Metrics reporting implemented
- [ ] Performance acceptable

---

## 📅 TIMELINE BREAKDOWN

### Week 1: Testing & Base Setup

**Day 1-2: Testing Infrastructure**
- Install dependencies
- Configure Vitest
- Create test utilities
- Write example tests

**Day 3-4: Base Classes**
- Create directory structure
- Define types and interfaces
- Create base manager class
- Write unit tests

**Day 5: Migration Strategy**
- Document migration plan
- Update event migration map
- Define rollout strategy

### Week 2: Documentation & Metrics

**Day 1-2: Architecture Documentation**
- Create architecture overview
- Draw component diagrams
- Create sequence diagrams

**Day 3: Monitoring Setup**
- Create metrics collector
- Implement stats collection
- Setup reporting

**Day 4-5: Review & Testing**
- Code review
- Integration testing
- Documentation review
- Prepare for Phase 1

---

## 🚀 NEXT STEPS

Sau khi Phase 0 hoàn thành:

1. ✅ Review và approve Phase 0 deliverables
2. ✅ Start Phase 2: Peer Connection Management
3. ✅ Begin implementing P2P managers using base classes
4. ✅ Continue testing throughout implementation

---

## 📝 NOTES

**Important:**
- Phase 0 là foundation cho tất cả phases sau
- Không skip Phase 0 vì sẽ gây technical debt
- Testing infrastructure là critical cho quality assurance
- Migration strategy đảm bảo zero downtime

**Dependencies:**
- Node.js 20+
- npm 9+
- TypeScript 5+
- React 19+

---

**Document Version:** 1.0  
**Created:** 2025-12-08  
**Author:** AI Assistant  
**Status:** Ready for Implementation  
**Estimated Effort:** 2 weeks (80 hours)
