# P2P WEBRTC IMPLEMENTATION GUIDE

> **Version:** 1.0 Final  
> **Date:** 2025-12-08  
> **Status:** Ready to Implement  
> **Timeline:** 10-12 weeks

---

## 📋 MỤC LỤC

1. [Tổng Quan](#tổng-quan)
2. [Hiện Trạng Codebase](#hiện-trạng-codebase)
3. [Phase 0: Foundation](#phase-0-foundation)
4. [Phase 1: Media Controls](#phase-1-media-controls)
5. [Phase 2: Peer Connection](#phase-2-peer-connection)
6. [Phase 3: Screen Sharing](#phase-3-screen-sharing)
7. [Phase 4: Layout Management](#phase-4-layout-management)
8. [Phase 5: Chat System](#phase-5-chat-system)
9. [Phase 6: User Management](#phase-6-user-management)
10. [Testing Strategy](#testing-strategy)
11. [Deployment Plan](#deployment-plan)

---

## 🎯 TỔNG QUAN

### Mục Tiêu
Refactor P2P WebRTC meeting room từ monolithic hook sang modular architecture với manager pattern, improve stability, performance, và maintainability.

### Scope
- **Frontend:** Refactor `use-webrtc.ts` và related components
- **Backend:** ✅ Đã hoàn thành (modular gateways)
- **Focus:** Testing, base classes, manager pattern, migration

### Timeline
- **Phase 0:** 2 weeks (Foundation)
- **Phase 1-6:** 8-10 weeks (Implementation)
- **Total:** 10-12 weeks

---

## 📊 HIỆN TRẠNG CODEBASE

### ✅ Backend: 100% Complete
**Modular Gateways:**
- `MediaGateway`: WebRTC signaling, media controls
- `UnifiedRoomGateway`: Room join/leave
- `ChatGateway`, `ModerationGateway`, `HandRaiseGateway`, etc.

**Services:**
- `AudioControlService`, `VideoControlService`, `ScreenShareService`
- `RoomStateManagerService`, `UserSocketManagerService`

### ⚠️ Frontend: 30% Complete
**Có:**
- `use-webrtc.ts` (792 lines) - monolithic
- Feature flag `use_new_gateway`
- UI components

**Thiếu:**
- Testing infrastructure (0%)
- Manager classes (0%)
- Base types (0%)
- Documentation (0%)

### Vấn Đề Cần Fix
1. Track replacement không atomic
2. State sync không consistent
3. Negotiation race conditions
4. Không có retry mechanism
5. Không có testing

---

## 🚀 PHASE 0: FOUNDATION (2 weeks)

### Mục Tiêu
Setup infrastructure, base classes, và documentation.

### Tasks

#### 1. Testing Infrastructure (3 days)

**Install dependencies:**
```bash
cd talkplatform-frontend
npm install --save-dev vitest @vitest/ui jsdom \
  @testing-library/react @testing-library/jest-dom \
  @testing-library/user-event mock-socket
```

**Files to create:**
```
vitest.config.ts
tests/setup.ts
tests/utils/webrtc-test-utils.ts
hooks/__tests__/use-webrtc.test.ts
```

**vitest.config.ts:**
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
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, './') },
  },
});
```

**tests/setup.ts:**
```typescript
import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock WebRTC APIs
global.RTCPeerConnection = vi.fn().mockImplementation(() => ({
  createOffer: vi.fn(),
  createAnswer: vi.fn(),
  setLocalDescription: vi.fn(),
  setRemoteDescription: vi.fn(),
  addIceCandidate: vi.fn(),
  addTrack: vi.fn(),
  getSenders: vi.fn(() => []),
  close: vi.fn(),
  connectionState: 'new',
  signalingState: 'stable',
}));

global.navigator.mediaDevices = {
  getUserMedia: vi.fn().mockResolvedValue({
    getTracks: () => [],
    getAudioTracks: () => [{ kind: 'audio', enabled: true }],
    getVideoTracks: () => [{ kind: 'video', enabled: true }],
  }),
  getDisplayMedia: vi.fn(),
} as any;
```

#### 2. Base Classes & Types (3 days)

**Directory structure:**
```
services/p2p/
├── core/
│   └── base-p2p-manager.ts
├── types/
│   ├── p2p-types.ts
│   ├── p2p-events.ts
│   └── index.ts
└── utils/
    └── p2p-metrics-collector.ts
```

**types/p2p-types.ts:**
```typescript
export interface P2PMediaState {
  mic: {
    enabled: boolean;
    track: MediaStreamTrack | null;
    isMuted: boolean;
    deviceId: string | null;
  };
  camera: {
    enabled: boolean;
    track: MediaStreamTrack | null;
    isVideoOff: boolean;
    deviceId: string | null;
  };
}

export interface PeerConnectionInfo {
  userId: string;
  connection: RTCPeerConnection;
  stream?: MediaStream;
  connectionState: RTCPeerConnectionState;
}

export enum P2PErrorType {
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  DEVICE_NOT_FOUND = 'DEVICE_NOT_FOUND',
  TRACK_REPLACEMENT_FAILED = 'TRACK_REPLACEMENT_FAILED',
  CONNECTION_FAILED = 'CONNECTION_FAILED',
}
```

**core/base-p2p-manager.ts:**
```typescript
import { Socket } from 'socket.io-client';
import { EventEmitter } from 'events';

export abstract class BaseP2PManager extends EventEmitter {
  protected socket: Socket | null = null;
  protected meetingId: string = '';
  protected userId: string = '';

  constructor(socket: Socket, meetingId: string, userId: string) {
    super();
    this.socket = socket;
    this.meetingId = meetingId;
    this.userId = userId;
  }

  abstract initialize(): Promise<void>;
  abstract cleanup(): void;

  protected log(level: 'info' | 'warn' | 'error', message: string, data?: any): void {
    const prefix = `[${this.constructor.name}]`;
    console[level](prefix, message, data);
  }

  protected emitSocketEvent(event: string, data: any): void {
    if (!this.socket?.connected) {
      this.log('error', `Cannot emit ${event}: socket not connected`);
      return;
    }
    this.socket.emit(event, data);
  }
}
```

#### 3. Documentation (2 days)

Create:
- Architecture diagrams
- Sequence diagrams
- API documentation

#### 4. Metrics Setup (1 day)

**utils/p2p-metrics-collector.ts:**
```typescript
export class P2PMetricsCollector {
  async collectConnectionStats(pc: RTCPeerConnection): Promise<any> {
    const stats = await pc.getStats();
    // Process stats
    return { bandwidth: 0, latency: 0, packetLoss: 0 };
  }
}
```

### Deliverables
- [ ] Testing infrastructure working
- [ ] Base classes created
- [ ] Types defined
- [ ] Documentation complete
- [ ] Metrics collector ready

---

## 🎨 PHASE 1: MEDIA CONTROLS (2-3 weeks)

### Mục Tiêu
Refactor mic/camera controls với manager pattern.

### Implementation

#### P2PMediaManager

**services/p2p/core/p2p-media-manager.ts:**
```typescript
import { BaseP2PManager } from './base-p2p-manager';
import { P2PMediaState } from '../types';

export class P2PMediaManager extends BaseP2PManager {
  private state: P2PMediaState = {
    mic: { enabled: false, track: null, isMuted: false, deviceId: null },
    camera: { enabled: false, track: null, isVideoOff: false, deviceId: null },
  };
  private localStream: MediaStream | null = null;
  private peers: Map<string, RTCPeerConnection> = new Map();

  async initialize(): Promise<void> {
    // Setup initial state
  }

  async enableMicrophone(enabled: boolean): Promise<void> {
    if (!this.localStream) return;
    
    const audioTrack = this.localStream.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = enabled;
      this.state.mic.enabled = enabled;
      
      // Sync to database
      this.emitSocketEvent('media:toggle-mic', { isMuted: !enabled });
      
      this.emit('mic-state-changed', { enabled });
    }
  }

  async enableCamera(enabled: boolean, deviceId?: string): Promise<void> {
    if (enabled) {
      await this.turnCameraOn(deviceId);
    } else {
      await this.turnCameraOff();
    }
  }

  private async turnCameraOn(deviceId?: string): Promise<void> {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { deviceId: deviceId ? { exact: deviceId } : undefined },
    });
    
    const newVideoTrack = stream.getVideoTracks()[0];
    
    // Replace in local stream
    if (this.localStream) {
      const oldTrack = this.localStream.getVideoTracks()[0];
      if (oldTrack) {
        this.localStream.removeTrack(oldTrack);
        oldTrack.stop();
      }
      this.localStream.addTrack(newVideoTrack);
    }
    
    // Replace in all peers with retry
    await this.replaceVideoTrackInAllPeers(newVideoTrack);
    
    this.state.camera.enabled = true;
    this.state.camera.track = newVideoTrack;
    
    this.emitSocketEvent('media:toggle-video', { isVideoOff: false });
    this.emit('camera-state-changed', { enabled: true });
  }

  private async turnCameraOff(): Promise<void> {
    if (!this.localStream) return;
    
    const videoTrack = this.localStream.getVideoTracks()[0];
    if (videoTrack) {
      videoTrack.enabled = false;
      this.state.camera.enabled = false;
      
      this.emitSocketEvent('media:toggle-video', { isVideoOff: true });
      this.emit('camera-state-changed', { enabled: false });
    }
  }

  private async replaceVideoTrackInAllPeers(track: MediaStreamTrack): Promise<void> {
    const promises = Array.from(this.peers.entries()).map(async ([userId, pc]) => {
      try {
        const sender = pc.getSenders().find(s => s.track?.kind === 'video');
        if (sender) {
          await sender.replaceTrack(track);
          this.log('info', `Replaced video track for ${userId}`);
        }
      } catch (error) {
        this.log('error', `Failed to replace track for ${userId}`, error);
        // Retry once
        await new Promise(r => setTimeout(r, 500));
        try {
          const sender = pc.getSenders().find(s => s.track?.kind === 'video');
          if (sender) await sender.replaceTrack(track);
        } catch (e) {
          this.log('error', `Retry failed for ${userId}`, e);
        }
      }
    });
    
    await Promise.allSettled(promises);
  }

  setPeers(peers: Map<string, RTCPeerConnection>): void {
    this.peers = peers;
  }

  setLocalStream(stream: MediaStream): void {
    this.localStream = stream;
  }

  cleanup(): void {
    this.localStream?.getTracks().forEach(t => t.stop());
    this.localStream = null;
  }
}
```

### Refactor use-webrtc.ts

```typescript
import { P2PMediaManager } from '@/services/p2p/core/p2p-media-manager';

export function useWebRTC({ socket, meetingId, userId }: UseWebRTCProps) {
  const mediaManagerRef = useRef<P2PMediaManager | null>(null);
  
  useEffect(() => {
    if (socket) {
      mediaManagerRef.current = new P2PMediaManager(socket, meetingId, userId);
      mediaManagerRef.current.initialize();
    }
    return () => mediaManagerRef.current?.cleanup();
  }, [socket, meetingId, userId]);
  
  const toggleMute = useCallback(() => {
    const currentState = !isMuted;
    mediaManagerRef.current?.enableMicrophone(!currentState);
    setIsMuted(currentState);
  }, [isMuted]);
  
  // Similar for toggleVideo
}
```

### Testing

```typescript
describe('P2PMediaManager', () => {
  it('should enable microphone', async () => {
    const manager = new P2PMediaManager(mockSocket, 'meeting-1', 'user-1');
    await manager.enableMicrophone(true);
    expect(mockSocket.emit).toHaveBeenCalledWith('media:toggle-mic', { isMuted: false });
  });
});
```

### Deliverables
- [ ] P2PMediaManager implemented
- [ ] use-webrtc.ts refactored
- [ ] Tests passing
- [ ] Device switching working

---

## 🔗 PHASE 2: PEER CONNECTION (1-2 weeks)

### P2PPeerConnectionManager

**services/p2p/core/p2p-peer-connection-manager.ts:**
```typescript
export class P2PPeerConnectionManager extends BaseP2PManager {
  private peers: Map<string, RTCPeerConnection> = new Map();
  private negotiationQueue: Map<string, Promise<void>> = new Map();
  private pendingCandidates: Map<string, RTCIceCandidateInit[]> = new Map();
  private readonly MAX_PENDING_CANDIDATES = 50;

  createPeerConnection(userId: string, localStream: MediaStream): RTCPeerConnection {
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
    });
    
    // Add tracks in order: audio first, then video
    localStream.getAudioTracks().forEach(t => pc.addTrack(t, localStream));
    localStream.getVideoTracks().forEach(t => pc.addTrack(t, localStream));
    
    pc.onicecandidate = (e) => this.handleIceCandidate(userId, e.candidate);
    pc.onnegotiationneeded = () => this.handleNegotiationNeeded(userId, pc);
    pc.ontrack = (e) => this.emit('track-received', { userId, stream: e.streams[0] });
    
    this.peers.set(userId, pc);
    return pc;
  }

  private async handleNegotiationNeeded(userId: string, pc: RTCPeerConnection): Promise<void> {
    if (this.negotiationQueue.has(userId)) return;
    
    const promise = (async () => {
      await this.waitForStableState(pc);
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      this.emitSocketEvent('media:offer', { roomId: this.meetingId, targetUserId: userId, offer });
    })();
    
    this.negotiationQueue.set(userId, promise);
    await promise;
    this.negotiationQueue.delete(userId);
  }

  private async waitForStableState(pc: RTCPeerConnection, maxWait = 1000): Promise<void> {
    const start = Date.now();
    while (pc.signalingState !== 'stable' && Date.now() - start < maxWait) {
      await new Promise(r => setTimeout(r, 50));
    }
  }

  async handleRemoteOffer(userId: string, offer: RTCSessionDescriptionInit): Promise<void> {
    const pc = this.peers.get(userId);
    if (!pc) return;
    
    await pc.setRemoteDescription(offer);
    await this.processPendingCandidates(userId);
    
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    this.emitSocketEvent('media:answer', { roomId: this.meetingId, targetUserId: userId, answer });
  }

  async addIceCandidate(userId: string, candidate: RTCIceCandidateInit): Promise<void> {
    const pc = this.peers.get(userId);
    if (!pc || !pc.remoteDescription) {
      // Queue for later
      const queue = this.pendingCandidates.get(userId) || [];
      if (queue.length < this.MAX_PENDING_CANDIDATES) {
        queue.push(candidate);
        this.pendingCandidates.set(userId, queue);
      }
      return;
    }
    
    await pc.addIceCandidate(candidate);
  }

  private async processPendingCandidates(userId: string): Promise<void> {
    const candidates = this.pendingCandidates.get(userId) || [];
    const pc = this.peers.get(userId);
    if (!pc) return;
    
    for (const candidate of candidates) {
      await pc.addIceCandidate(candidate);
    }
    this.pendingCandidates.delete(userId);
  }

  cleanup(): void {
    this.peers.forEach(pc => pc.close());
    this.peers.clear();
    this.negotiationQueue.clear();
    this.pendingCandidates.clear();
  }
}
```

---

## 🖥️ PHASE 3: SCREEN SHARING (1 week)

**services/p2p/features/p2p-screen-share-manager.ts:**
```typescript
export class P2PScreenShareManager extends BaseP2PManager {
  private isSharing = false;
  private screenTrack: MediaStreamTrack | null = null;
  private cameraTrack: MediaStreamTrack | null = null;

  async startScreenShare(localStream: MediaStream, peers: Map<string, RTCPeerConnection>): Promise<void> {
    const displayStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
    const screenTrack = displayStream.getVideoTracks()[0];
    
    // Save camera track
    this.cameraTrack = localStream.getVideoTracks()[0];
    
    // Replace camera with screen in all peers
    for (const [userId, pc] of peers) {
      const sender = pc.getSenders().find(s => s.track?.kind === 'video');
      if (sender) await sender.replaceTrack(screenTrack);
    }
    
    // Handle user stop
    screenTrack.onended = () => this.stopScreenShare(localStream, peers);
    
    this.screenTrack = screenTrack;
    this.isSharing = true;
    this.emitSocketEvent('media:screen-share', { isSharing: true });
  }

  async stopScreenShare(localStream: MediaStream, peers: Map<string, RTCPeerConnection>): Promise<void> {
    if (!this.isSharing) return;
    
    this.screenTrack?.stop();
    
    // Restore camera
    if (this.cameraTrack && this.cameraTrack.readyState === 'live') {
      for (const [userId, pc] of peers) {
        const sender = pc.getSenders().find(s => s.track?.kind === 'video');
        if (sender) await sender.replaceTrack(this.cameraTrack);
      }
    }
    
    this.isSharing = false;
    this.emitSocketEvent('media:screen-share', { isSharing: false });
  }
}
```

---

## 📐 PHASE 4-6: REMAINING FEATURES

### Phase 4: Layout Manager
- Grid, Spotlight, Focus modes
- Virtual scrolling

### Phase 5: Chat Manager
- Message ordering
- Pagination
- Offline queue

### Phase 6: Moderation Manager
- Event deduplication
- Atomic actions

---

## 🧪 TESTING STRATEGY

### Unit Tests
```typescript
describe('P2PMediaManager', () => {
  it('should toggle mic');
  it('should toggle camera');
  it('should handle device switching');
});
```

### Integration Tests
```typescript
describe('Meeting Room', () => {
  it('should handle full meeting flow');
});
```

---

## 🚀 DEPLOYMENT PLAN

### Week 0-1: Phase 0
- Setup testing
- Create base classes

### Week 2-4: Phase 1
- Implement MediaManager
- Refactor use-webrtc

### Week 4-5: Phase 2
- Implement PeerConnectionManager

### Week 5-10: Phase 3-6
- Remaining features

### Week 10-12: Testing & Deployment
- Comprehensive testing
- Production rollout

---

**Version:** 1.0  
**Status:** ✅ Ready to Implement
