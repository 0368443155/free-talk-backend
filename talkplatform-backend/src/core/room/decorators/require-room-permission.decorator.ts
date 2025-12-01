import { SetMetadata } from '@nestjs/common';

export const ROOM_PERMISSION_KEY = 'room-permission';

export enum RoomPermission {
  HOST = 'host',
  MODERATOR = 'moderator',
  PARTICIPANT = 'participant',
}

/**
 * Decorator to mark a method/class as requiring a specific room permission
 */
export const RequireRoomPermission = (...permissions: RoomPermission[]) =>
  SetMetadata(ROOM_PERMISSION_KEY, permissions);

