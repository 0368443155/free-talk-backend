# P2P MEETING ROOM - HƯỚNG DẪN TRIỂN KHAI CHI TIẾT

> **Version:** 1.0 Final  
> **Date:** 2025-12-08  
> **Status:** ✅ Ready for Implementation  
> **Based on:** Codebase Audit (2025-12-08)

---

## 📋 MỤC LỤC

1. [Tổng Quan Codebase](#tổng-quan-codebase)
2. [Kiến Trúc Hệ Thống](#kiến-trúc-hệ-thống)
3. [Hiện Trạng Phân Tích](#hiện-trạng-phân-tích)
4. [Phase 0: Foundation Setup](#phase-0-foundation-setup)
5. [Phase 1-6: Implementation Details](#phase-1-6-implementation-details)
6. [Testing Strategy](#testing-strategy)
7. [Deployment Plan](#deployment-plan)

---

## 🎯 TỔNG QUAN CODEBASE

### Database Structure - Unified Meetings Table

**Quan trọng:** Tất cả meetings từ mọi nguồn (class, booking, course, public) đều được lưu vào **1 bảng `meetings` duy nhất**, phân biệt bằng các thuộc tính:

```typescript
// talkplatform-backend/src/features/meeting/entities/meeting.entity.ts

@Entity('meetings')
export class Meeting {
  id: string; // UUID
  
  // Phân biệt nguồn gốc meeting
  @Column({ nullable: true })
  classroom_id: string; // Nếu từ Classroom
  
  @Column({ nullable: true })
  course_id: string; // Nếu từ Course
  
  @Column({ nullable: true })
  session_id: string; // Nếu từ Course Session
  
  @Column({ nullable: true })
  lesson_id: string; // Nếu từ Course Lesson
  
  // Phân loại meeting type
  @Column({
    type: 'enum',
    enum: MeetingType,
    default: MeetingType.FREE_TALK,
  })
  meeting_type: MeetingType; // FREE_TALK | TEACHER_CLASS | WORKSHOP | PRIVATE_SESSION
  
  // Thuộc tính phân biệt
  @Column({ default: false })
  is_classroom_only: boolean; // true nếu từ Classroom
  
  @Column({ default: false })
  is_private: boolean; // true nếu từ Booking (private session)
  
  // ... các thuộc tính khác
}
```

### Meeting Creation Sources

**1. Classroom Meetings:**
```typescript
// talkplatform-backend/src/features/meeting/classrooms.service.ts
// Line 159-231
async createClassroomMeeting(classroomId: string, dto: CreateMeetingDto, user: User) {
  const meeting = this.meetingRepository.create({
    ...meetingData,
    classroom: { id: classroomId },
    is_classroom_only: true, // ← Đánh dấu từ Classroom
    host: user,
  });
}
```

**2. Booking Meetings (Private Sessions):**
```typescript
// talkplatform-backend/src/features/booking/booking.service.ts
// Line 99-114
const meeting = manager.create(Meeting, {
  title: `Private Session - ${teacher.username}`,
  meeting_type: MeetingType.PRIVATE_SESSION, // ← Type riêng
  is_private: true, // ← Đánh dấu private
  max_participants: 2,
  pricing_type: PricingType.CREDITS,
  price_credits: slot.price_credits,
});
```

**3. Course Lesson Meetings:**
```typescript
// talkplatform-backend/src/features/courses/courses.service.ts
// Line 627-647
const meeting = manager.create(Meeting, {
  title: `${course.title} - ${session.title} - ${lesson.title}`,
  course_id: savedCourse.id, // ← Link đến Course
  session_id: savedSession.id, // ← Link đến Session
  lesson_id: undefined, // Set sau khi lesson created
  meeting_type: MeetingType.TEACHER_CLASS, // ← Type cho courses
  max_participants: savedCourse.max_students,
});
```

**4. Public Meetings (Free Talk):**
```typescript
// talkplatform-backend/src/features/meeting/meetings.service.ts
// Line 75-89
async createPublicMeeting(createMeetingDto: CreateMeetingDto, user: User) {
  const meeting = this.meetingRepository.create({
    ...meetingDefaults,
    meeting_type: MeetingType.FREE_TALK, // ← Default type
    host: user,
    // Không set classroom_id, course_id, etc.
  });
}
```

### Backend Gateway Architecture

**✅ ĐÃ HOÀN THÀNH:** Modular gateway system

```
talkplatform-backend/src/features/
├── room-gateway/
│   └── unified-room.gateway.ts          # Main gateway: room:join, room:leave
├── room-features/
│   ├── media/
│   │   └── gateways/
│   │       └── media.gateway.ts         # WebRTC signaling: media:offer, media:answer, media:ice-candidate
│   │                                    # Media controls: media:toggle-mic, media:toggle-video, media:screen-share
│   ├── chat/
│   │   └── gateways/
│   │       └── chat.gateway.ts          # Chat: chat:send, chat:history
│   ├── moderation/
│   │   └── gateways/
│   │       └── moderation.gateway.ts    # Admin: admin:mute-user, admin:video-off-user, admin:kick-user
│   └── ...
```

**MediaGateway Events:**
- `media:offer` - WebRTC offer
- `media:answer` - WebRTC answer
- `media:ice-candidate` - ICE candidate
- `media:ready` - User ready for WebRTC
- `media:toggle-mic` - Toggle microphone
- `media:toggle-video` - Toggle camera
- `media:screen-share` - Screen sharing
- `admin:mute-user` - Host mute user
- `admin:video-off-user` - Host turn off user video

### Frontend Architecture

**⚠️ CẦN REFACTOR:**

```
talkplatform-frontend/
├── hooks/
│   └── use-webrtc.ts                    # 792 lines - MONOLITHIC ⚠️
├── section/meetings/
│   ├── meeting-room.tsx                 # 1470 lines - TOO LARGE ⚠️
│   └── video-grid.tsx                   # Performance issues ⚠️
├── components/meeting/
│   ├── meeting-chat-panel.tsx
│   └── meeting-participants-panel.tsx
└── services/
    └── api/                             # Chỉ có API calls, chưa có P2P services
```

**Testing Infrastructure:**
- ❌ **KHÔNG CÓ** - `package.json` không có test scripts
- ❌ **KHÔNG CÓ** - Không có Vitest/Jest
- ❌ **KHÔNG CÓ** - Không có test files

---

## 🏗️ KIẾN TRÚC HỆ THỐNG

### Current Architecture (P2P Mesh)

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (Next.js 15)                    │
├─────────────────────────────────────────────────────────────┤
│  Meeting Room Component (meeting-room.tsx)                   │
│    │                                                         │
│    ├─ use-webrtc.ts (792 lines - monolithic)                │
│    │   ├─ Local MediaStream                                 │
│    │   ├─ RTCPeerConnection (per peer)                      │
│    │   ├─ Socket.IO client                                  │
│    │   └─ State management (useState, useRef)               │
│    │                                                         │
│    ├─ Video Grid (video-grid.tsx)                           │
│    ├─ Chat Panel (meeting-chat-panel.tsx)                   │
│    └─ Participants Panel (meeting-participants-panel.tsx)   │
└─────────────────────────────────────────────────────────────┘
                          │
                          │ Socket.IO
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                   Backend (NestJS)                           │
├─────────────────────────────────────────────────────────────┤
│  UnifiedRoomGateway                                          │
│    ├─ room:join                                             │
│    └─ room:leave                                            │
│                                                              │
│  MediaGateway (namespace: /media)                           │
│    ├─ WebRTC signaling (offer/answer/ICE)                   │
│    ├─ Media controls (mic/video/screen)                     │
│    └─ Admin moderation                                      │
│                                                              │
│  ChatGateway, ModerationGateway, ...                        │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│              Database (PostgreSQL)                           │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  meetings (unified table)                              │ │
│  │  - id, meeting_type, classroom_id, course_id,          │ │
│  │    session_id, lesson_id, is_private, etc.            │ │
│  └────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  meeting_participants                                  │ │
│  │  - meeting_id, user_id, role, is_online, is_muted,    │ │
│  │    is_video_off, is_screen_sharing                    │ │
│  └────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  meeting_chat_messages                                 │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### P2P Mesh Topology

```
        Peer A (User 1)
            │   │
            │   ├─────────────────→ Peer B (User 2)
            │   │                    │   │
            │   │                    │   ├─→ Peer C (User 3)
            │   │                    │   │    │   │
            │   ├────────────────────┼───┼────┼───┼─→ Peer D (User 4)
            │   │                    │   │    │   │
            │   └────────────────────┼───┼────┘   │
            │                        │   │        │
            └────────────────────────┘   └────────┘

Mỗi peer maintain RTCPeerConnection trực tiếp với tất cả peers khác
```

---

## 📊 HIỆN TRẠNG PHÂN TÍCH

### ✅ ĐÃ CÓ SẴN (Backend - 100%)

**1. Modular Gateway System:**
- ✅ `UnifiedRoomGateway` - Room join/leave
- ✅ `MediaGateway` - WebRTC signaling & media controls
- ✅ `ChatGateway` - Chat functionality
- ✅ `ModerationGateway` - Host moderation
- ✅ Tất cả services đã implement

**2. Database Structure:**
- ✅ Unified `meetings` table với đầy đủ trường phân biệt
- ✅ `meeting_participants` table với state tracking
- ✅ `meeting_chat_messages` table
- ✅ `meeting_settings` table

**3. Meeting Creation:**
- ✅ Tất cả nguồn (class/booking/course/public) đều tạo vào `meetings` table
- ✅ Phân biệt bằng `meeting_type` + các foreign keys

### ⚠️ CẦN CẢI THIỆN (Frontend - 30%)

**1. Testing Infrastructure:**
- ❌ **KHÔNG CÓ** - Package.json không có test scripts
- ❌ **KHÔNG CÓ** - Không có Vitest/Jest
- ❌ **KHÔNG CÓ** - Không có test utilities
- ❌ **KHÔNG CÓ** - Không có WebRTC mocks

**2. Code Organization:**
- ⚠️ `use-webrtc.ts` - 792 lines, monolithic
- ⚠️ `meeting-room.tsx` - 1470 lines, quá lớn
- ⚠️ Logic lẫn lộn với UI
- ❌ Không có manager classes

**3. Known Issues:**
- ❌ Track replacement không atomic
- ❌ State sync không consistent
- ❌ Negotiation race conditions
- ❌ ICE candidate handling không đầy đủ
- ❌ Screen share cleanup không đầy đủ
- ❌ Không có retry mechanism

**4. Feature Flag:**
- ✅ Có `useFeatureFlag('use_new_gateway')` trong `use-webrtc.ts`
- ⚠️ Đang dùng dual events (old + new) nhưng chưa migrate hoàn toàn

---

## 🚀 PHASE 0: FOUNDATION SETUP

**Timeline:** 2 tuần (Week 0-1)  
**Priority:** 🔴 CRITICAL

### Task 1: Testing Infrastructure Setup (3-4 ngày)

**Vấn đề:** Frontend **KHÔNG CÓ** testing infrastructure

**Quyết định:** **SỬ DỤNG VITEST** vì:
1. ✅ Fast và modern (tương thích với Next.js 15)
2. ✅ Hỗ trợ tốt cho TypeScript
3. ✅ Works với React Testing Library
4. ✅ Built-in coverage support

**Implementation:**

**1.1. Install Dependencies:**
```bash
cd talkplatform-frontend
npm install --save-dev \
  vitest@^1.0.4 \
  @vitest/ui@^1.0.4 \
  jsdom@^23.0.1 \
  @testing-library/react@^14.1.2 \
  @testing-library/jest-dom@^6.1.5 \
  @testing-library/user-event@^14.5.1 \
  mock-socket@^9.3.1 \
  @types/mock-socket@^9.0.8
```

**1.2. Create Vitest Config:**
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
        '.next/',
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

**1.3. Update package.json:**
```json
{
  "scripts": {
    "dev": "next dev --port 3001",
    "build": "next build",
    "start": "next start --port 3001",
    "lint": "next lint",
    "type-check": "tsc --noEmit",
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest --coverage",
    "test:watch": "vitest --watch"
  }
}
```

**1.4. Create Test Setup:**
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
})) as any;

global.RTCSessionDescription = vi.fn() as any;
global.RTCIceCandidate = vi.fn() as any;

// Mock MediaStream
const mockTrack = {
  kind: 'video',
  id: 'mock-track-id',
  label: 'mock-track',
  enabled: true,
  readyState: 'live',
  stop: vi.fn(),
  getSettings: vi.fn(() => ({ deviceId: 'mock-device-id' })),
  onended: null,
};

global.MediaStream = vi.fn().mockImplementation(() => ({
  getTracks: vi.fn(() => [mockTrack]),
  getAudioTracks: vi.fn(() => [{ ...mockTrack, kind: 'audio' }]),
  getVideoTracks: vi.fn(() => [{ ...mockTrack, kind: 'video' }]),
  addTrack: vi.fn(),
  removeTrack: vi.fn(),
  active: true,
  id: 'mock-stream-id',
})) as any;

// Mock getUserMedia
global.navigator.mediaDevices = {
  getUserMedia: vi.fn().mockResolvedValue({
    getTracks: () => [mockTrack],
    getAudioTracks: () => [{ ...mockTrack, kind: 'audio' }],
    getVideoTracks: () => [{ ...mockTrack, kind: 'video' }],
    addTrack: vi.fn(),
    removeTrack: vi.fn(),
    active: true,
    id: 'mock-stream-id',
  }),
  getDisplayMedia: vi.fn().mockResolvedValue({
    getTracks: () => [mockTrack],
    getVideoTracks: () => [mockTrack],
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

**1.5. Create Test Utilities:**
**File:** `talkplatform-frontend/tests/utils/webrtc-test-utils.ts` (NEW)

```typescript
import { vi } from 'vitest';

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
    _trigger: (event: string, data: any) => {
      const handler = eventHandlers.get(event);
      if (handler) handler(data);
    },
  };
}

export function waitForAsync(ms: number = 0): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
```

**1.6. Create Example Test:**
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

      expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalled();
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
    });
  });
});
```

**Deliverables:**
- [ ] Vitest installed và configured
- [ ] Test setup file created
- [ ] Test utilities created
- [ ] Example test passes
- [ ] `npm test` command works

---

### Task 2: Base Classes & Types (3 ngày)

**Vấn đề:** Chưa có structure cho P2P managers

**Implementation:**

**2.1. Create Directory Structure:**
```
talkplatform-frontend/
└── services/
    └── p2p/                              # NEW
        ├── core/
        │   ├── base-p2p-manager.ts
        │   ├── p2p-media-manager.ts      # Phase 1
        │   ├── p2p-stream-manager.ts     # Phase 1
        │   ├── p2p-peer-connection-manager.ts  # Phase 2
        │   └── p2p-track-state-sync.ts   # Phase 1
        ├── features/
        │   ├── p2p-screen-share-manager.ts      # Phase 3
        │   ├── p2p-layout-manager.ts            # Phase 4
        │   ├── p2p-moderation-manager.ts        # Phase 6
        │   └── chat-manager.ts                  # Phase 5
        ├── utils/
        │   ├── event-deduplicator.ts            # Phase 6
        │   ├── p2p-error-handler.ts
        │   └── p2p-metrics-collector.ts
        └── types/
            ├── p2p-types.ts
            ├── p2p-events.ts
            └── index.ts
```

**2.2. Create Base Types:**
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
 * Media Manager Configuration
 */
export interface MediaManagerConfig {
  socket: Socket;
  meetingId: string;
  userId: string;
  iceServers?: RTCIceServer[];
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
```

**2.3. Create Base Manager:**
**File:** `talkplatform-frontend/services/p2p/core/base-p2p-manager.ts` (NEW)

```typescript
import { Socket } from 'socket.io-client';
import { EventEmitter } from 'events';

/**
 * Base class cho tất cả P2P managers
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

  abstract initialize(): Promise<void>;
  abstract cleanup(): void;

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

  protected emitSocketEvent(event: string, data: any, callback?: (response: any) => void): void {
    if (!this.socket || !this.socket.connected) {
      this.log('error', `Cannot emit ${event}: socket not connected`);
      return;
    }

    this.socket.emit(event, data, callback);
    this.log('info', `Emitted ${event}`, data);
  }

  protected onSocketEvent(event: string, handler: (...args: any[]) => void): void {
    if (!this.socket) {
      this.log('error', `Cannot listen to ${event}: socket not available`);
      return;
    }

    this.socket.on(event, handler);
    this.log('info', `Listening to ${event}`);
  }

  protected offSocketEvent(event: string, handler?: (...args: any[]) => void): void {
    if (!this.socket) return;

    if (handler) {
      this.socket.off(event, handler);
    } else {
      this.socket.off(event);
    }
    this.log('info', `Stopped listening to ${event}`);
  }

  isReady(): boolean {
    return this.isInitialized;
  }
}
```

**Deliverables:**
- [ ] Directory structure created
- [ ] Base types defined
- [ ] Base manager class created
- [ ] All types exported correctly

---

### Task 3: Migration Strategy (2 ngày)

**Vấn đề:** Frontend đang dùng dual events (old + new), cần migrate hoàn toàn sang new events

**Hiện trạng:**
- ✅ Backend modular gateways đã sẵn sàng
- ⚠️ Frontend có feature flag `use_new_gateway` nhưng chưa enable hoàn toàn
- ⚠️ `use-webrtc.ts` đang dùng cả old events (`webrtc:*`) và new events (`media:*`)

**Migration Plan:**

**3.1. Update use-webrtc.ts để dùng new events:**
- Remove old event handlers
- Use `media:*` events exclusively
- Remove feature flag checks (hoặc enable by default)

**3.2. Test với backend:**
- Verify all events work với MediaGateway
- Test với UnifiedRoomGateway

**Deliverables:**
- [ ] Migration plan documented
- [ ] use-webrtc.ts updated
- [ ] All tests passing
- [ ] Manual testing complete

---

### Task 4: Documentation (2 ngày)

**Create Architecture Documentation:**
- Architecture overview với diagrams
- Component responsibilities
- Sequence diagrams cho WebRTC flows
- API documentation

**Deliverables:**
- [ ] Architecture docs created
- [ ] Sequence diagrams created
- [ ] API docs started

---

### Task 5: Monitoring Setup (1 ngày)

**Create Metrics Collector:**
**File:** `talkplatform-frontend/services/p2p/utils/p2p-metrics-collector.ts` (NEW)

```typescript
export class P2PMetricsCollector {
  async collectConnectionStats(pc: RTCPeerConnection): Promise<any> {
    const stats = await pc.getStats();
    // Process stats
    return { bandwidth: 0, latency: 0, packetLoss: 0 };
  }
}
```

**Deliverables:**
- [ ] Metrics collector created
- [ ] Stats collection working

---

## 🎯 PHASE 1-6: IMPLEMENTATION DETAILS

### Phase 1: Media Controls (Mic/Cam) - 2-3 weeks

**Priority:** 🔴 CRITICAL

**Tasks:**
1. Create `P2PMediaManager` class
2. Create `P2PStreamManager` class
3. Create `P2PTrackStateSync` class
4. Refactor `use-webrtc.ts` để sử dụng managers
5. Fix track replacement issues
6. Fix state sync issues
7. Add device management
8. Testing

**Files to create:**
- `services/p2p/core/p2p-media-manager.ts`
- `services/p2p/core/p2p-stream-manager.ts`
- `services/p2p/core/p2p-track-state-sync.ts`

**Files to modify:**
- `hooks/use-webrtc.ts` (refactor)
- `section/meetings/meeting-room.tsx` (update)

**Key Implementation:**
- Unified state management
- Atomic track replacement với retry
- Database sync
- Host moderation enforcement

---

### Phase 2: Peer Connection Management - 1-2 weeks

**Priority:** 🔴 CRITICAL

**Tasks:**
1. Create `P2PPeerConnectionManager` class
2. Implement negotiation queue
3. Implement ICE candidate queue with limits
4. Implement connection recovery
5. Testing

**Files to create:**
- `services/p2p/core/p2p-peer-connection-manager.ts`

**Key Implementation:**
- Negotiation queue để tránh race conditions
- ICE candidate queue với MAX limit (50)
- Connection recovery với exponential backoff
- Track order consistency (audio first, then video)

---

### Phase 3: Screen Sharing - 1 week

**Priority:** 🟠 HIGH

**Tasks:**
1. Create `P2PScreenShareManager` class
2. Implement camera restoration
3. Browser compatibility checks
4. Testing

**Files to create:**
- `services/p2p/features/p2p-screen-share-manager.ts`

**Key Implementation:**
- Proper camera restoration logic
- Handle user cancellation từ browser UI
- Cleanup on error
- Retry mechanism

---

### Phase 4: Layout Management - 1-2 weeks

**Priority:** 🟡 MEDIUM

**Tasks:**
1. Create `P2PLayoutManager` class
2. Implement multiple layout modes (Grid, Spotlight, Focus)
3. Virtual scrolling
4. Refactor `video-grid.tsx`
5. Testing

**Files to create:**
- `services/p2p/features/p2p-layout-manager.ts`

**Files to modify:**
- `section/meetings/video-grid.tsx` (refactor)

---

### Phase 5: Chat System - 1 week

**Priority:** 🟡 MEDIUM

**Tasks:**
1. Create `ChatManager` class
2. Message ordering
3. Pagination
4. Offline queue
5. Testing

**Files to create:**
- `services/p2p/features/chat-manager.ts`

**Files to modify:**
- `hooks/use-meeting-chat.ts` (refactor)
- `components/meeting/meeting-chat-panel.tsx` (update)

---

### Phase 6: User Management - 1 week

**Priority:** 🟠 HIGH

**Tasks:**
1. Create `EventDeduplicator` class
2. Create `P2PModerationManager` class
3. Atomic moderation actions
4. Testing

**Files to create:**
- `services/p2p/utils/event-deduplicator.ts`
- `services/p2p/features/p2p-moderation-manager.ts`

**Files to modify:**
- `components/meeting/meeting-participants-panel.tsx` (refactor)

---

## 🧪 TESTING STRATEGY

### Unit Tests (Vitest)

```typescript
describe('P2PMediaManager', () => {
  it('should enable microphone', async () => {
    // Test implementation
  });
  
  it('should toggle camera', async () => {
    // Test implementation
  });
  
  it('should handle device switching', async () => {
    // Test implementation
  });
});
```

### Integration Tests

```typescript
describe('Meeting Room Integration', () => {
  it('should handle full meeting flow', async () => {
    // Test implementation
  });
});
```

### E2E Tests (Manual for now)

- Join meeting
- Toggle mic/cam
- Screen share
- Chat
- Leave meeting

---

## 📅 DEPLOYMENT PLAN

### Week 0-1: Phase 0 (Foundation)
- [ ] Testing infrastructure
- [ ] Base classes
- [ ] Migration prep
- [ ] Documentation

### Week 2-4: Phase 1 (Media Controls)
- [ ] P2PMediaManager
- [ ] P2PStreamManager
- [ ] Refactor use-webrtc.ts
- [ ] Testing

### Week 4-5: Phase 2 (Peer Connection)
- [ ] P2PPeerConnectionManager
- [ ] Negotiation queue
- [ ] ICE handling
- [ ] Testing

### Week 5-6: Phase 3 (Screen Sharing)
- [ ] P2PScreenShareManager
- [ ] Camera restoration
- [ ] Testing

### Week 6-7: Phase 6 (User Management)
- [ ] EventDeduplicator
- [ ] P2PModerationManager
- [ ] Testing

### Week 7-8: Phase 5 (Chat)
- [ ] ChatManager
- [ ] Message ordering
- [ ] Testing

### Week 8-10: Phase 4 (Layout)
- [ ] P2PLayoutManager
- [ ] Virtual scrolling
- [ ] Testing

### Week 10-12: Final Testing & Deployment
- [ ] Comprehensive testing
- [ ] Performance optimization
- [ ] Production rollout

---

## ✅ ACCEPTANCE CRITERIA

### Phase 0 Complete:
- [ ] Testing infrastructure working
- [ ] Base classes created
- [ ] Types defined
- [ ] Documentation complete
- [ ] Migration plan ready

### Phase 1 Complete:
- [ ] No duplicate permission requests
- [ ] State sync works correctly
- [ ] Track replacement works reliably
- [ ] Device switching works
- [ ] Host moderation enforces on MediaStream level

### Phase 2 Complete:
- [ ] No negotiation race conditions
- [ ] ICE candidates handled properly
- [ ] Connection recovery works
- [ ] Track order consistent

### Phase 3 Complete:
- [ ] Screen share starts successfully
- [ ] User cancellation handled
- [ ] Cleanup works on error
- [ ] Browser compatibility checked

### Phase 4 Complete:
- [ ] Grid layout works
- [ ] Spotlight mode works
- [ ] Focus mode works
- [ ] Performance acceptable với 20+ participants

### Phase 5 Complete:
- [ ] Message ordering correct
- [ ] Pagination works
- [ ] Offline messages queued

### Phase 6 Complete:
- [ ] No duplicate events
- [ ] Moderation actions atomic
- [ ] No race conditions

---

## 📝 NOTES

**Important:**
- Phase 0 là foundation bắt buộc
- Không skip Phase 0
- Testing infrastructure critical cho quality
- Migration strategy đảm bảo zero downtime

**Dependencies:**
- Node.js 20+
- npm 9+
- TypeScript 5+
- React 19+
- Next.js 15+

---

**Document Version:** 1.0  
**Created:** 2025-12-08  
**Status:** ✅ READY FOR IMPLEMENTATION  
**Estimated Total Timeline:** 10-12 weeks

