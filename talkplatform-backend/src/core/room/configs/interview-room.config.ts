import { RoomConfig } from '../interfaces/room-config.interface';
import { RoomType } from '../enums/room-type.enum';
import { RoomFeature } from '../enums/room-feature.enum';
import { ModerationLevel } from '../enums/moderation-level.enum';

export const INTERVIEW_ROOM_CONFIG: RoomConfig = {
  roomType: RoomType.INTERVIEW,
  displayName: 'Interview Room',
  description: 'One-on-one interview session',
  features: [
    RoomFeature.AUDIO,
    RoomFeature.VIDEO,
    RoomFeature.SCREEN_SHARE,
    RoomFeature.CHAT,
    RoomFeature.RECORDING,
  ],
  maxParticipants: 2,
  requiresPayment: false,
  requiresEnrollment: false,
  timeRestricted: false,
  moderationLevel: ModerationLevel.BASIC,
  defaultSettings: {
    autoMuteOnJoin: false,
    autoVideoOffOnJoin: false,
    waitingRoomEnabled: false,
    chatEnabled: true,
    reactionsEnabled: false,
    recordingEnabled: true,
  },
  accessControl: {
    requiresEnrollment: false,
    requiresPayment: false,
    timeRestricted: false,
    maxParticipants: 2,
  },
  livekitSettings: {
    roomNamePrefix: 'interview',
    videoCodec: 'vp8',
    audioCodec: 'opus',
    simulcast: false,
    dynacast: false,
  },
  stateManagement: {
    useRedis: true,
    stateTtl: 3600, // 1 hour
    persistState: true,
  },
};

