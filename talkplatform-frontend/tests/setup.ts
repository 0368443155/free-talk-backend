import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

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
    onsignalingstatechange: null,
    localDescription: null,
    remoteDescription: null,
    getConfiguration: vi.fn(() => ({ iceServers: [] })),
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

// Mock MediaStreamTrack
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
} as any as MediaStreamTrack);

global.MediaStream = vi.fn().mockImplementation((tracks?: MediaStreamTrack[]) => {
  const audioTracks: MediaStreamTrack[] = tracks?.filter(t => t.kind === 'audio') || [createMockTrack('audio')];
  const videoTracks: MediaStreamTrack[] = tracks?.filter(t => t.kind === 'video') || [];

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
      const audioIndex = audioTracks.indexOf(track);
      const videoIndex = videoTracks.indexOf(track);
      if (audioIndex !== -1) audioTracks.splice(audioIndex, 1);
      if (videoIndex !== -1) videoTracks.splice(videoIndex, 1);
    }),
    getTrackById: vi.fn((id: string) => {
      return [...audioTracks, ...videoTracks].find(t => t.id === id) || null;
    }),
    clone: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn().mockReturnValue(true),
  } as any;
}) as any;

// Mock getUserMedia
// Use Object.defineProperty to override read-only property
Object.defineProperty(global.navigator, 'mediaDevices', {
  writable: true,
  configurable: true,
  value: {
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
    ] as MediaDeviceInfo[]),
    
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
  },
});

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

