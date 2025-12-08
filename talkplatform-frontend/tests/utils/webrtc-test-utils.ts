import { vi } from 'vitest';

/**
 * Create mock MediaStreamTrack for testing
 */
export function createMockMediaStreamTrack(
  kind: 'audio' | 'video',
  id?: string
): MediaStreamTrack {
  return {
    kind,
    id: id || `mock-${kind}-track-${Date.now()}`,
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
  } as unknown as MediaStreamTrack;
}

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
    onsignalingstatechange: null,
    localDescription: null,
    remoteDescription: null,
    getConfiguration: vi.fn(() => ({ iceServers: [] })),
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
  tracks?: MediaStreamTrack[];
}): MediaStream {
  const { hasAudio = true, hasVideo = true, audioTrackId, videoTrackId, tracks } = options || {};

  const streamTracks: MediaStreamTrack[] = tracks || [];
  
  if (!tracks) {
    if (hasAudio) {
      streamTracks.push(createMockMediaStreamTrack('audio', audioTrackId));
    }
    if (hasVideo) {
      streamTracks.push(createMockMediaStreamTrack('video', videoTrackId));
    }
  }

  return {
    id: `mock-stream-${Date.now()}`,
    active: true,
    getTracks: vi.fn(() => streamTracks),
    getAudioTracks: vi.fn(() => streamTracks.filter(t => t.kind === 'audio')),
    getVideoTracks: vi.fn(() => streamTracks.filter(t => t.kind === 'video')),
    addTrack: vi.fn((track: MediaStreamTrack) => {
      streamTracks.push(track);
    }),
    removeTrack: vi.fn((track: MediaStreamTrack) => {
      const index = streamTracks.indexOf(track);
      if (index !== -1) streamTracks.splice(index, 1);
    }),
    getTrackById: vi.fn((id: string) => streamTracks.find(t => t.id === id) || null),
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
 * Simulate signaling state change
 */
export function simulateSignalingStateChange(
  pc: RTCPeerConnection,
  state: RTCSignalingState
): void {
  (pc as any).signalingState = state;
  if (pc.onsignalingstatechange) {
    pc.onsignalingstatechange(new Event('signalingstatechange') as any);
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

