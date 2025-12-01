import { RoomType } from '../enums/room-type.enum';
import { RoomConfig } from '../interfaces/room-config.interface';
import { FREE_TALK_ROOM_CONFIG } from './free-talk-room.config';
import { LESSON_ROOM_CONFIG } from './lesson-room.config';
import { TEACHER_CLASS_ROOM_CONFIG } from './teacher-class-room.config';
import { WEBINAR_ROOM_CONFIG } from './webinar-room.config';
import { INTERVIEW_ROOM_CONFIG } from './interview-room.config';

/**
 * Map of room types to their configurations
 */
export const ROOM_CONFIGS: Record<RoomType, RoomConfig> = {
  [RoomType.FREE_TALK]: FREE_TALK_ROOM_CONFIG,
  [RoomType.LESSON]: LESSON_ROOM_CONFIG,
  [RoomType.TEACHER_CLASS]: TEACHER_CLASS_ROOM_CONFIG,
  [RoomType.WORKSHOP]: TEACHER_CLASS_ROOM_CONFIG, // Use teacher class config as default
  [RoomType.PRIVATE_SESSION]: INTERVIEW_ROOM_CONFIG, // Use interview config as default
  [RoomType.WEBINAR]: WEBINAR_ROOM_CONFIG,
  [RoomType.INTERVIEW]: INTERVIEW_ROOM_CONFIG,
};

/**
 * Get room configuration by type
 */
export function getRoomConfig(roomType: RoomType): RoomConfig {
  const config = ROOM_CONFIGS[roomType];
  if (!config) {
    throw new Error(`Room configuration not found for type: ${roomType}`);
  }
  return config;
}

