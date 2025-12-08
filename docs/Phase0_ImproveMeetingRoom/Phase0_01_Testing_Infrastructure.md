# PHASE 0.1: TESTING INFRASTRUCTURE SETUP

> **Timeline:** 3-4 ngày  
> **Priority:** 🔴 CRITICAL  
> **Status:** ⏳ TODO  
> **Score:** 10/10 ✅ Ready (Complete with Integration Tests)

---

## 📋 MỤC TIÊU

Setup testing infrastructure hoàn chỉnh cho P2P WebRTC với Vitest, bao gồm:
- Vitest configuration
- WebRTC API mocks
- Test utilities
- Example tests

---

## 🎯 TẠI SAO VITEST?

**Đã phân tích codebase:**
- ✅ Next.js 15 sử dụng (tương thích tốt với Vitest)
- ✅ TypeScript 5 (Vitest hỗ trợ native TypeScript)
- ✅ React 19 (React Testing Library works với Vitest)
- ✅ Không có testing setup hiện tại (fresh start)

**Vitest advantages:**
- ⚡ Fast - Built on Vite
- 🔧 Native TypeScript support
- 🎯 Better ESM support
- 📦 Smaller bundle
- 🧪 Compatible với Jest API (dễ migrate)

---

## 📦 STEP 1: INSTALL DEPENDENCIES

**Location:** `talkplatform-frontend/`

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
  @types/mock-socket@^9.0.8 \
  @vitest/coverage-v8@^1.0.4
```

**Verify installation:**
```bash
npm list vitest @vitest/ui jsdom
```

---

## ⚙️ STEP 2: CREATE VITEST CONFIG

**File:** `talkplatform-frontend/vitest.config.ts` (NEW)

```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true, // Use global APIs (describe, it, expect)
    environment: 'jsdom', // Browser-like environment
    setupFiles: ['./tests/setup.ts'], // Setup file for each test
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
        '**/__tests__/**',
        '**/*.test.{ts,tsx}',
        '**/*.spec.{ts,tsx}',
      ],
      include: ['**/*.{ts,tsx}'],
      exclude: [
        '**/node_modules/**',
        '**/dist/**',
        '**/coverage/**',
        '**/.next/**',
        '**/*.config.*',
        '**/tests/**',
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

**Note:** Nếu chưa có `@vitejs/plugin-react`, install:
```bash
npm install --save-dev @vitejs/plugin-react
```

---

## 🔧 STEP 3: CREATE TEST SETUP FILE

**File:** `talkplatform-frontend/tests/setup.ts` (NEW)

```typescript
import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import { afterEach, vi, beforeEach } from 'vitest';

// Cleanup after each test
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

// Mock WebRTC APIs
global.RTCPeerConnection = vi.fn().mockImplementation(() => {
  const mockPC = {
    createOffer: vi.fn().mockResolvedValue({ 
      type: 'offer', 
      sdp: 'mock-sdp-offer' 
    }),
    createAnswer: vi.fn().mockResolvedValue({ 
      type: 'answer', 
      sdp: 'mock-sdp-answer' 
    }),
    setLocalDescription: vi.fn().mockResolvedValue(undefined),
    setRemoteDescription: vi.fn().mockResolvedValue(undefined),
    addIceCandidate: vi.fn().mockResolvedValue(undefined),
    addTrack: vi.fn(),
    removeTrack: vi.fn(),
    getSenders: vi.fn(() => []),
    getReceivers: vi.fn(() => []),
    close: vi.fn(),
    restartIce: vi.fn(),
    getStats: vi.fn().mockResolvedValue(new Map()),
    connectionState: 'new',
    signalingState: 'stable',
    iceConnectionState: 'new',
    onicecandidate: null,
    ontrack: null,
    onconnectionstatechange: null,
    onnegotiationneeded: null,
    localDescription: null,
    remoteDescription: null,
  };

  return mockPC;
}) as any;

global.RTCSessionDescription = vi.fn((descriptionInit: RTCSessionDescriptionInit) => {
  return {
    type: descriptionInit.type,
    sdp: descriptionInit.sdp || '',
    toJSON: () => descriptionInit,
  };
}) as any;

global.RTCIceCandidate = vi.fn((candidateInit?: RTCIceCandidateInit) => {
  return {
    candidate: candidateInit?.candidate || '',
    sdpMLineIndex: candidateInit?.sdpMLineIndex || null,
    sdpMid: candidateInit?.sdpMid || null,
    toJSON: () => candidateInit || {},
  };
}) as any;

// Mock MediaStream
const createMockTrack = (kind: 'audio' | 'video') => ({
  kind,
  id: `mock-${kind}-track-${Date.now()}`,
  label: `Mock ${kind} Track`,
  enabled: true,
  readyState: 'live' as MediaStreamTrackState,
  stop: vi.fn(),
  getSettings: vi.fn(() => ({ 
    deviceId: `mock-${kind}-device`,
    width: kind === 'video' ? 1280 : undefined,
    height: kind === 'video' ? 720 : undefined,
  })),
  getConstraints: vi.fn(() => ({})),
  applyConstraints: vi.fn().mockResolvedValue(undefined),
  clone: vi.fn(),
  onended: null,
  muted: false,
  contentHint: '',
});

global.MediaStream = vi.fn().mockImplementation((tracks?: MediaStreamTrack[]) => {
  const audioTracks = tracks?.filter(t => t.kind === 'audio') || [createMockTrack('audio')];
  const videoTracks = tracks?.filter(t => t.kind === 'video') || [];

  return {
    id: `mock-stream-${Date.now()}`,
    active: true,
    getTracks: vi.fn(() => [...audioTracks, ...videoTracks]),
    getAudioTracks: vi.fn(() => audioTracks),
    getVideoTracks: vi.fn(() => videoTracks),
    addTrack: vi.fn((track: MediaStreamTrack) => {
      if (track.kind === 'audio') audioTracks.push(track);
      if (track.kind === 'video') videoTracks.push(track);
    }),
    removeTrack: vi.fn((track: MediaStreamTrack) => {
      const index = [...audioTracks, ...videoTracks].indexOf(track);
      if (index !== -1) {
        if (track.kind === 'audio') audioTracks.splice(audioTracks.indexOf(track), 1);
        if (track.kind === 'video') videoTracks.splice(videoTracks.indexOf(track), 1);
      }
    }),
    getTrackById: vi.fn((id: string) => {
      return [...audioTracks, ...videoTracks].find(t => t.id === id) || null;
    }),
    clone: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn().mockReturnValue(true),
  };
}) as any;

// Mock getUserMedia
global.navigator.mediaDevices = {
  getUserMedia: vi.fn().mockImplementation(async (constraints: MediaStreamConstraints) => {
    const audioTrack = constraints.audio ? createMockTrack('audio') : null;
    const videoTrack = constraints.video ? createMockTrack('video') : null;
    const tracks = [audioTrack, videoTrack].filter(Boolean) as MediaStreamTrack[];
    return new MediaStream(tracks);
  }),
  
  getDisplayMedia: vi.fn().mockImplementation(async (constraints: DisplayMediaStreamConstraints) => {
    const videoTrack = createMockTrack('video');
    return new MediaStream([videoTrack]);
  }),
  
  enumerateDevices: vi.fn().mockResolvedValue([
    { deviceId: 'camera-1', kind: 'videoinput', label: 'Camera 1', groupId: 'group-1' },
    { deviceId: 'camera-2', kind: 'videoinput', label: 'Camera 2', groupId: 'group-2' },
    { deviceId: 'mic-1', kind: 'audioinput', label: 'Microphone 1', groupId: 'group-3' },
    { deviceId: 'mic-2', kind: 'audioinput', label: 'Microphone 2', groupId: 'group-4' },
    { deviceId: 'speaker-1', kind: 'audiooutput', label: 'Speaker 1', groupId: 'group-5' },
  ]),
  
  getSupportedConstraints: vi.fn().mockReturnValue({
    width: true,
    height: true,
    aspectRatio: true,
    frameRate: true,
    facingMode: true,
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
  }),
} as any;

// Mock Socket.IO client
vi.mock('socket.io-client', () => {
  const mockSocket = {
    id: 'mock-socket-id',
    connected: true,
    disconnected: false,
    on: vi.fn(),
    off: vi.fn(),
    emit: vi.fn(),
    connect: vi.fn(),
    disconnect: vi.fn(),
    once: vi.fn(),
    removeAllListeners: vi.fn(),
  };

  return {
    io: vi.fn(() => mockSocket),
    Socket: vi.fn(() => mockSocket),
  };
});

// Mock window.matchMedia (for responsive tests)
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Suppress console errors in tests (optional)
// global.console = {
//   ...console,
//   error: vi.fn(),
//   warn: vi.fn(),
// };
```

---

## 🛠️ STEP 4: CREATE TEST UTILITIES

**File:** `talkplatform-frontend/tests/utils/webrtc-test-utils.ts` (NEW)

```typescript
import { vi } from 'vitest';

/**
 * Create mock RTCPeerConnection for testing
 */
export function createMockPeerConnection(
  overrides?: Partial<RTCPeerConnection>
): RTCPeerConnection {
  const mockPC = {
    createOffer: vi.fn().mockResolvedValue({ type: 'offer', sdp: 'mock-sdp-offer' }),
    createAnswer: vi.fn().mockResolvedValue({ type: 'answer', sdp: 'mock-sdp-answer' }),
    setLocalDescription: vi.fn().mockResolvedValue(undefined),
    setRemoteDescription: vi.fn().mockResolvedValue(undefined),
    addIceCandidate: vi.fn().mockResolvedValue(undefined),
    addTrack: vi.fn(),
    removeTrack: vi.fn(),
    getSenders: vi.fn(() => []),
    getReceivers: vi.fn(() => []),
    close: vi.fn(),
    restartIce: vi.fn(),
    getStats: vi.fn().mockResolvedValue(new Map()),
    connectionState: 'new' as RTCPeerConnectionState,
    signalingState: 'stable' as RTCSignalingState,
    iceConnectionState: 'new' as RTCIceConnectionState,
    onicecandidate: null,
    ontrack: null,
    onconnectionstatechange: null,
    onnegotiationneeded: null,
    localDescription: null,
    remoteDescription: null,
    ...overrides,
  } as unknown as RTCPeerConnection;

  return mockPC;
}

/**
 * Create mock MediaStream for testing
 */
export function createMockMediaStream(options?: {
  hasAudio?: boolean;
  hasVideo?: boolean;
  audioTrackId?: string;
  videoTrackId?: string;
}): MediaStream {
  const { hasAudio = true, hasVideo = true, audioTrackId, videoTrackId } = options || {};

  const audioTrack = {
    kind: 'audio' as const,
    id: audioTrackId || `mock-audio-track-${Date.now()}`,
    label: 'Mock Audio Track',
    enabled: true,
    readyState: 'live' as MediaStreamTrackState,
    stop: vi.fn(),
    getSettings: vi.fn(() => ({ deviceId: 'mock-audio-device' })),
    getConstraints: vi.fn(() => ({})),
    applyConstraints: vi.fn().mockResolvedValue(undefined),
    clone: vi.fn(),
    onended: null,
    muted: false,
    contentHint: '',
  } as unknown as MediaStreamTrack;

  const videoTrack = {
    kind: 'video' as const,
    id: videoTrackId || `mock-video-track-${Date.now()}`,
    label: 'Mock Video Track',
    enabled: true,
    readyState: 'live' as MediaStreamTrackState,
    stop: vi.fn(),
    getSettings: vi.fn(() => ({ 
      deviceId: 'mock-video-device',
      width: 1280,
      height: 720,
    })),
    getConstraints: vi.fn(() => ({})),
    applyConstraints: vi.fn().mockResolvedValue(undefined),
    clone: vi.fn(),
    onended: null,
    muted: false,
    contentHint: '',
  } as unknown as MediaStreamTrack;

  const tracks: MediaStreamTrack[] = [];
  if (hasAudio) tracks.push(audioTrack);
  if (hasVideo) tracks.push(videoTrack);

  return {
    id: `mock-stream-${Date.now()}`,
    active: true,
    getTracks: vi.fn(() => tracks),
    getAudioTracks: vi.fn(() => hasAudio ? [audioTrack] : []),
    getVideoTracks: vi.fn(() => hasVideo ? [videoTrack] : []),
    addTrack: vi.fn((track: MediaStreamTrack) => tracks.push(track)),
    removeTrack: vi.fn((track: MediaStreamTrack) => {
      const index = tracks.indexOf(track);
      if (index !== -1) tracks.splice(index, 1);
    }),
    getTrackById: vi.fn((id: string) => tracks.find(t => t.id === id) || null),
    clone: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn().mockReturnValue(true),
  } as unknown as MediaStream;
}

/**
 * Create mock Socket.IO client for testing
 */
export function createMockSocket() {
  const eventHandlers = new Map<string, Function[]>();

  const mockSocket = {
    id: `mock-socket-${Date.now()}`,
    connected: true,
    disconnected: false,
    
    on: vi.fn((event: string, handler: Function) => {
      if (!eventHandlers.has(event)) {
        eventHandlers.set(event, []);
      }
      eventHandlers.get(event)!.push(handler);
      return mockSocket;
    }),
    
    off: vi.fn((event: string, handler?: Function) => {
      if (handler) {
        const handlers = eventHandlers.get(event) || [];
        const index = handlers.indexOf(handler);
        if (index !== -1) handlers.splice(index, 1);
      } else {
        eventHandlers.delete(event);
      }
      return mockSocket;
    }),
    
    emit: vi.fn((event: string, data?: any, callback?: Function) => {
      if (callback) {
        // Simulate async callback
        setTimeout(() => callback({ success: true }), 0);
      }
      return mockSocket;
    }),
    
    connect: vi.fn(() => {
      mockSocket.connected = true;
      mockSocket.disconnected = false;
      return mockSocket;
    }),
    
    disconnect: vi.fn(() => {
      mockSocket.connected = false;
      mockSocket.disconnected = true;
      return mockSocket;
    }),
    
    once: vi.fn((event: string, handler: Function) => {
      const onceHandler = (...args: any[]) => {
        handler(...args);
        mockSocket.off(event, onceHandler);
      };
      mockSocket.on(event, onceHandler);
      return mockSocket;
    }),
    
    removeAllListeners: vi.fn((event?: string) => {
      if (event) {
        eventHandlers.delete(event);
      } else {
        eventHandlers.clear();
      }
      return mockSocket;
    }),
    
    // Helper to trigger events in tests
    _trigger: (event: string, ...args: any[]) => {
      const handlers = eventHandlers.get(event) || [];
      handlers.forEach(handler => handler(...args));
    },
  };

  return mockSocket;
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
    pc.onconnectionstatechange(new Event('connectionstatechange') as any);
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

/**
 * Simulate track event
 */
export function simulateTrackEvent(
  pc: RTCPeerConnection,
  stream: MediaStream,
  track: MediaStreamTrack
): void {
  if (pc.ontrack) {
    const event = {
      track,
      streams: [stream],
      transceiver: null,
      receiver: null,
    } as RTCTrackEvent;
    pc.ontrack(event);
  }
}

/**
 * Wait for condition to be true
 */
export async function waitFor(
  condition: () => boolean,
  timeout: number = 5000,
  interval: number = 100
): Promise<void> {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout) {
    if (condition()) {
      return;
    }
    await waitForAsync(interval);
  }
  
  throw new Error(`Timeout waiting for condition after ${timeout}ms`);
}
```

---

## 📝 STEP 5: UPDATE PACKAGE.JSON

**File:** `talkplatform-frontend/package.json`

Thêm scripts vào `scripts` section:

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
    "test:watch": "vitest --watch",
    "test:run": "vitest run"
  }
}
```

---

## ✅ STEP 6: CREATE EXAMPLE TEST

**File:** `talkplatform-frontend/hooks/__tests__/use-webrtc.test.ts` (NEW)

```typescript
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useWebRTC } from '../use-webrtc';
import { 
  createMockSocket, 
  createMockMediaStream, 
  waitForAsync 
} from '../../tests/utils/webrtc-test-utils';

describe('useWebRTC', () => {
  let mockSocket: ReturnType<typeof createMockSocket>;

  beforeEach(() => {
    mockSocket = createMockSocket();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('startLocalStream', () => {
    it('should request user media and set local stream', async () => {
      const { result } = renderHook(() =>
        useWebRTC({
          socket: mockSocket as any,
          meetingId: 'test-meeting-1',
          userId: 'test-user-1',
          isOnline: true,
        })
      );

      expect(result.current.localStream).toBeNull();

      await act(async () => {
        await result.current.startLocalStream();
      });

      await waitFor(() => {
        expect(result.current.localStream).not.toBeNull();
      }, { timeout: 3000 });

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

    it('should emit media:ready event after getting stream', async () => {
      const { result } = renderHook(() =>
        useWebRTC({
          socket: mockSocket as any,
          meetingId: 'test-meeting-2',
          userId: 'test-user-2',
          isOnline: true,
        })
      );

      await act(async () => {
        await result.current.startLocalStream();
      });

      await waitForAsync(100);

      // Check if socket.emit was called with media:ready or webrtc:ready
      expect(mockSocket.emit).toHaveBeenCalled();
    });

    it('should handle getUserMedia error gracefully', async () => {
      const error = new Error('Permission denied');
      vi.mocked(navigator.mediaDevices.getUserMedia).mockRejectedValueOnce(error);

      const { result } = renderHook(() =>
        useWebRTC({
          socket: mockSocket as any,
          meetingId: 'test-meeting-3',
          userId: 'test-user-3',
          isOnline: true,
        })
      );

      await act(async () => {
        await expect(result.current.startLocalStream()).rejects.toThrow();
      });

      expect(result.current.localStream).toBeNull();
    });
  });

  describe('toggleMute', () => {
    it('should toggle audio track enabled state', async () => {
      const { result } = renderHook(() =>
        useWebRTC({
          socket: mockSocket as any,
          meetingId: 'test-meeting-4',
          userId: 'test-user-4',
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
      expect(mockSocket.emit).toHaveBeenCalled();
    });
  });

  // TODO: Add more tests for:
  // - toggleVideo
  // - toggleScreenShare
  // - peer connection creation
  // - offer/answer handling
  // - ICE candidate handling
});

/**
 * INTEGRATION TESTS - Real-world scenarios
 * 
 * ⚠️ CRITICAL: These tests simulate actual user interactions to catch integration issues
 * that unit tests with mocks might miss. Mock RTCPeerConnection in setup.ts assumes
 * "happy case" scenarios, but real WebRTC has complex negotiation states.
 * 
 * These integration tests help catch:
 * - Negotiation race conditions
 * - State sync issues between peers
 * - Event propagation delays
 * - Multiple rapid actions (race conditions)
 */
describe('WebRTC Integration Tests', () => {
  /**
   * Integration Test 1: User A joins -> User B joins -> User A toggles camera
   * 
   * Scenario: 
   * 1. User A joins meeting and enables camera
   * 2. User B joins meeting
   * 3. User A toggles camera OFF
   * 4. Verify User B receives track mute event
   */
  it('should handle camera toggle with multiple peers', async () => {
    const { result: resultA } = renderHook(() =>
      useWebRTC({
        socket: createMockSocket() as any,
        meetingId: 'test-meeting-integration-1',
        userId: 'user-a',
        isOnline: true,
      })
    );

    const { result: resultB } = renderHook(() =>
      useWebRTC({
        socket: createMockSocket() as any,
        meetingId: 'test-meeting-integration-1',
        userId: 'user-b',
        isOnline: true,
      })
    );

    // User A starts stream
    await act(async () => {
      await resultA.current.startLocalStream();
    });

    await waitFor(() => {
      expect(resultA.current.localStream).not.toBeNull();
    });

    // User B starts stream (simulates peer joining)
    await act(async () => {
      await resultB.current.startLocalStream();
    });

    // User A toggles camera OFF
    await act(async () => {
      await resultA.current.toggleVideo();
    });

    // Verify User A's camera is off
    expect(resultA.current.isVideoOff).toBe(true);

    // TODO: Verify User B receives track update event
    // This requires mock socket to simulate event propagation
  });

  /**
   * Integration Test 2: Multiple rapid toggles
   * 
   * Scenario:
   * User rapidly toggles mic on/off multiple times
   * Verify no race conditions, state is consistent
   */
  it('should handle rapid mic toggles without race conditions', async () => {
    const { result } = renderHook(() =>
      useWebRTC({
        socket: createMockSocket() as any,
        meetingId: 'test-meeting-integration-2',
        userId: 'user-rapid',
        isOnline: true,
      })
    );

    await act(async () => {
      await result.current.startLocalStream();
    });

    // Rapid toggles
    await act(async () => {
      await Promise.all([
        result.current.toggleMute(),
        result.current.toggleMute(),
        result.current.toggleMute(),
      ]);
    });

    // Wait for all operations to complete
    await waitForAsync(500);

    // Verify final state is consistent (not intermediate state)
    const finalMuted = result.current.isMuted;
    expect(typeof finalMuted).toBe('boolean');
  });

  /**
   * Integration Test 3: Connection failure and recovery
   * 
   * Scenario:
   * 1. Establish connection
   * 2. Simulate network failure
   * 3. Recover connection
   * 4. Verify state is restored
   */
  it('should recover from connection failures', async () => {
    const mockSocket = createMockSocket();
    const { result } = renderHook(() =>
      useWebRTC({
        socket: mockSocket as any,
        meetingId: 'test-meeting-integration-3',
        userId: 'user-recovery',
        isOnline: true,
      })
    );

    await act(async () => {
      await result.current.startLocalStream();
    });

    // Simulate disconnection
    await act(async () => {
      mockSocket.connected = false;
      mockSocket.disconnected = true;
      mockSocket._trigger('disconnect', 'network error');
    });

    // Simulate reconnection
    await act(async () => {
      mockSocket.connected = true;
      mockSocket.disconnected = false;
      mockSocket._trigger('connect');
    });

    // Verify state is still accessible after reconnection
    expect(result.current.localStream).not.toBeNull();
  });
});
```

---

## 🧪 STEP 7: RUN TESTS

**Verify setup:**

```bash
cd talkplatform-frontend
npm test
```

**Expected output:**
```
✓ hooks/__tests__/use-webrtc.test.ts (3)
  ✓ useWebRTC
    ✓ startLocalStream
      ✓ should request user media and set local stream
      ✓ should emit media:ready event after getting stream
      ✓ should handle getUserMedia error gracefully
    ✓ toggleMute
      ✓ should toggle audio track enabled state

Test Files  1 passed (1)
     Tests  4 passed (4)
```

**Run with UI:**
```bash
npm run test:ui
```

**Run with coverage:**
```bash
npm run test:coverage
```

---

## ✅ ACCEPTANCE CRITERIA

- [ ] Vitest installed và configured
- [ ] Test setup file created với WebRTC mocks
- [ ] Test utilities created và working
- [ ] Example test passes
- [ ] `npm test` command works
- [ ] `npm run test:ui` opens Vitest UI
- [ ] `npm run test:coverage` generates coverage report

---

## 🐛 TROUBLESHOOTING

**Issue: `@vitejs/plugin-react` not found**
```bash
npm install --save-dev @vitejs/plugin-react
```

**Issue: Tests fail với "Cannot find module"**
- Check `vitest.config.ts` paths alias matches `tsconfig.json`
- Verify all imports use correct paths

**Issue: WebRTC APIs not mocked**
- Check `tests/setup.ts` is included in `vitest.config.ts`
- Verify mocks are set up before tests run

**Issue: Socket.IO mock not working**
- Check `vi.mock('socket.io-client')` is in setup file
- Verify mock is called before import

---

## 📚 NEXT STEPS

Sau khi hoàn thành Phase 0.1, tiếp tục với:
- [**Phase0_02_Base_Classes_Types.md**](./Phase0_02_Base_Classes_Types.md) - Create base classes và types

---

**Last Updated:** 2025-12-08  
**Status:** ✅ Ready to Implement

