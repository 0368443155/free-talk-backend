import { RoomConfig } from '../interfaces/room-config.interface';
import { RoomType } from '../enums/room-type.enum';
import { RoomFeature } from '../enums/room-feature.enum';
import { ModerationLevel } from '../enums/moderation-level.enum';

export const TEACHER_CLASS_ROOM_CONFIG: RoomConfig = {
  roomType: RoomType.TEACHER_CLASS,
  displayName: 'Teacher Class',
  description: 'Teacher-led class with interactive features',
  features: [
    RoomFeature.AUDIO,
    RoomFeature.VIDEO,
    RoomFeature.SCREEN_SHARE,
    RoomFeature.CHAT,
    RoomFeature.YOUTUBE_SYNC,
    RoomFeature.WHITEBOARD,
    RoomFeature.POLLS,
    RoomFeature.HAND_RAISE,
    RoomFeature.REACTIONS,
    RoomFeature.WAITING_ROOM,
    RoomFeature.KICK_USER,
    RoomFeature.MUTE_CONTROL,
    RoomFeature.BLOCK_USER,
    RoomFeature.ROOM_LOCK,
    RoomFeature.RECORDING,
  ],
  maxParticipants: 50,
  requiresPayment: true,
  requiresEnrollment: false,
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
    requiresEnrollment: false,
    requiresPayment: true,
    timeRestricted: true,
    maxParticipants: 50,
  },
  livekitSettings: {
    roomNamePrefix: 'teacher-class',
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

