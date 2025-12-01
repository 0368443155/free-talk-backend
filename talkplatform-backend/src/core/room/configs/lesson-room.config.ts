import { RoomConfig } from '../interfaces/room-config.interface';
import { RoomType } from '../enums/room-type.enum';
import { RoomFeature } from '../enums/room-feature.enum';
import { ModerationLevel } from '../enums/moderation-level.enum';

export const LESSON_ROOM_CONFIG: RoomConfig = {
  roomType: RoomType.LESSON,
  displayName: 'Lesson Room',
  description: 'Structured lesson with teacher and students',
  features: [
    RoomFeature.AUDIO,
    RoomFeature.VIDEO,
    RoomFeature.SCREEN_SHARE,
    RoomFeature.CHAT,
    RoomFeature.WHITEBOARD,
    RoomFeature.HAND_RAISE,
    RoomFeature.WAITING_ROOM,
    RoomFeature.MUTE_CONTROL,
    RoomFeature.KICK_USER,
    RoomFeature.RECORDING,
    RoomFeature.ANALYTICS,
  ],
  maxParticipants: 30,
  requiresPayment: true,
  requiresEnrollment: true,
  timeRestricted: true,
  moderationLevel: ModerationLevel.ADVANCED,
  defaultSettings: {
    autoMuteOnJoin: true,
    autoVideoOffOnJoin: false,
    waitingRoomEnabled: true,
    chatEnabled: true,
    reactionsEnabled: true,
    recordingEnabled: false,
  },
  accessControl: {
    requiresEnrollment: true,
    requiresPayment: true,
    timeRestricted: true,
    maxParticipants: 30,
  },
  livekitSettings: {
    roomNamePrefix: 'lesson',
    videoCodec: 'vp8',
    audioCodec: 'opus',
    simulcast: true,
    dynacast: true,
  },
  stateManagement: {
    useRedis: true,
    stateTtl: 7200, // 2 hours
    persistState: true,
  },
};

