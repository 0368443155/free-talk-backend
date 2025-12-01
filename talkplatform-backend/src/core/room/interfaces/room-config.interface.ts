import { RoomType } from '../enums/room-type.enum';
import { RoomFeature } from '../enums/room-feature.enum';
import { ModerationLevel } from '../enums/moderation-level.enum';

/**
 * Default settings for a room
 */
export interface RoomDefaultSettings {
  /** Automatically mute participants when they join */
  autoMuteOnJoin: boolean;
  
  /** Automatically turn off video when participants join */
  autoVideoOffOnJoin: boolean;
  
  /** Enable waiting room by default */
  waitingRoomEnabled: boolean;
  
  /** Enable chat by default */
  chatEnabled: boolean;
  
  /** Enable reactions by default */
  reactionsEnabled: boolean;
  
  /** Enable recording by default */
  recordingEnabled: boolean;
}

/**
 * Access control configuration
 */
export interface RoomAccessControl {
  /** Require enrollment to join */
  requiresEnrollment: boolean;
  
  /** Require payment to join */
  requiresPayment: boolean;
  
  /** Time-based restrictions */
  timeRestricted: boolean;
  
  /** Maximum number of participants */
  maxParticipants: number;
  
  /** Minimum level required */
  minLevel?: string;
  
  /** Allowed roles */
  allowedRoles?: string[];
}

/**
 * LiveKit settings
 */
export interface LiveKitSettings {
  /** Room name prefix */
  roomNamePrefix: string;
  
  /** Enable video codec */
  videoCodec?: string;
  
  /** Enable audio codec */
  audioCodec?: string;
  
  /** Enable simulcast */
  simulcast?: boolean;
  
  /** Enable dynacast */
  dynacast?: boolean;
}

/**
 * State management configuration
 */
export interface StateManagementConfig {
  /** Use Redis for state management */
  useRedis: boolean;
  
  /** TTL for state in seconds */
  stateTtl?: number;
  
  /** Enable state persistence */
  persistState: boolean;
}

/**
 * Complete room configuration
 */
export interface RoomConfig {
  /** Type of room */
  roomType: RoomType;
  
  /** Display name */
  displayName: string;
  
  /** Description */
  description: string;
  
  /** Enabled features */
  features: RoomFeature[];
  
  /** Maximum participants */
  maxParticipants: number;
  
  /** Requires payment */
  requiresPayment: boolean;
  
  /** Requires enrollment */
  requiresEnrollment: boolean;
  
  /** Time restricted */
  timeRestricted: boolean;
  
  /** Moderation level */
  moderationLevel: ModerationLevel;
  
  /** Default settings */
  defaultSettings: RoomDefaultSettings;
  
  /** Access control */
  accessControl: RoomAccessControl;
  
  /** LiveKit settings */
  livekitSettings: LiveKitSettings;
  
  /** State management */
  stateManagement: StateManagementConfig;
}

