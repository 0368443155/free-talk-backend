import { RoomConfig } from '../interfaces/room-config.interface';
import { RoomType } from '../enums/room-type.enum';
import { RoomFeature } from '../enums/room-feature.enum';
import { ModerationLevel } from '../enums/moderation-level.enum';

export const WEBINAR_ROOM_CONFIG: RoomConfig = {
  roomType: RoomType.WEBINAR,
  displayName: 'Webinar',
  description: 'Large-scale webinar with limited interaction',
  features: [
    RoomFeature.AUDIO,
    RoomFeature.VIDEO,
    RoomFeature.SCREEN_SHARE,
    RoomFeature.CHAT,
    RoomFeature.HAND_RAISE,
    RoomFeature.POLLS,
    RoomFeature.WAITING_ROOM,
    RoomFeature.MUTE_CONTROL,
    RoomFeature.RECORDING,
    RoomFeature.ANALYTICS,
  ],
  maxParticipants: 100,
  requiresPayment: true,
  requiresEnrollment: false,
  timeRestricted: true,
  moderationLevel: ModerationLevel.ADVANCED,
  defaultSettings: {
    autoMuteOnJoin: true,
    autoVideoOffOnJoin: true,
    waitingRoomEnabled: true,
    chatEnabled: true,
    reactionsEnabled: false,
    recordingEnabled: true,
  },
  accessControl: {
    requiresEnrollment: false,
    requiresPayment: true,
    timeRestricted: true,
    maxParticipants: 100,
  },
  livekitSettings: {
    roomNamePrefix: 'webinar',
    videoCodec: 'vp8',
    audioCodec: 'opus',
    simulcast: true,
    dynacast: false,
  },
  stateManagement: {
    useRedis: true,
    stateTtl: 10800, // 3 hours
    persistState: true,
  },
};

