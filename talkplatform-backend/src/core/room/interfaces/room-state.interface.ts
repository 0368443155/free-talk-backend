import { RoomType } from '../enums/room-type.enum';
import { RoomStatus } from '../enums/room-status.enum';
import { RoomFeature } from '../enums/room-feature.enum';

/**
 * Participant role in room
 */
export enum ParticipantRole {
  HOST = 'host',
  MODERATOR = 'moderator',
  PARTICIPANT = 'participant',
  OBSERVER = 'observer',
}

/**
 * Participant state
 */
export interface ParticipantState {
  userId: string;
  username: string;
  role: ParticipantRole;
  isOnline: boolean;
  isMuted: boolean;
  isVideoOff: boolean;
  isHandRaised: boolean;
  isScreenSharing: boolean;
  joinedAt: Date;
  lastActivity: Date;
}

/**
 * Feature state
 */
export interface FeatureState {
  feature: RoomFeature;
  enabled: boolean;
  config: Record<string, any>;
  state: Record<string, any>;
}

/**
 * Room state
 */
export interface RoomState {
  roomId: string;
  roomType: RoomType;
  status: RoomStatus;
  hostId: string;
  participants: Map<string, ParticipantState>;
  features: Map<RoomFeature, FeatureState>;
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

