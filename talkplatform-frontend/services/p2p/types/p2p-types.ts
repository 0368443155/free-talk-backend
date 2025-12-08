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

