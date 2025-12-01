import { SetMetadata } from '@nestjs/common';
import { RoomFeature } from '../enums/room-feature.enum';

export const ROOM_FEATURE_KEY = 'room-feature';

/**
 * Decorator to mark a method/class as requiring a specific room feature
 */
export const RequireRoomFeature = (...features: RoomFeature[]) =>
  SetMetadata(ROOM_FEATURE_KEY, features);

