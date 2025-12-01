import { RoomConfig } from '../interfaces/room-config.interface';
import { RoomType } from '../enums/room-type.enum';
import { RoomFeature } from '../enums/room-feature.enum';
import { ModerationLevel } from '../enums/moderation-level.enum';

export const FREE_TALK_ROOM_CONFIG: RoomConfig = {
  roomType: RoomType.FREE_TALK,
  displayName: 'Free Talk Room',
  description: 'Casual conversation for language practice',
  features: [
    RoomFeature.AUDIO,
    RoomFeature.VIDEO,
    RoomFeature.CHAT,
    RoomFeature.REACTIONS,
    RoomFeature.HAND_RAISE,
  ],
  maxParticipants: 4,
  requiresPayment: false,
  requiresEnrollment: false,
  timeRestricted: false,
  moderationLevel: ModerationLevel.BASIC,
  defaultSettings: {
    autoMuteOnJoin: false,
    autoVideoOffOnJoin: false,
    waitingRoomEnabled: false,
    chatEnabled: true,
    reactionsEnabled: true,
    recordingEnabled: false,
  },
  accessControl: {
    requiresEnrollment: false,
    requiresPayment: false,
    timeRestricted: false,
    maxParticipants: 4,
  },
  livekitSettings: {
    roomNamePrefix: 'free-talk',
    videoCodec: 'vp8',
    audioCodec: 'opus',
    simulcast: false,
    dynacast: false,
  },
  stateManagement: {
    useRedis: true,
    stateTtl: 3600, // 1 hour
    persistState: false,
  },
};

