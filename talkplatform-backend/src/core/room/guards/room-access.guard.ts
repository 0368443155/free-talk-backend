import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { BaseRoomService } from '../services/base-room.service';
import { RoomPermission, ROOM_PERMISSION_KEY } from '../decorators/require-room-permission.decorator';
import { ParticipantRole } from '../interfaces/room-state.interface';

@Injectable()
export class RoomAccessGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly baseRoomService: BaseRoomService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions = this.reflector.getAllAndOverride<RoomPermission[]>(
      ROOM_PERMISSION_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const roomId = request.params?.roomId || request.body?.roomId || request.query?.roomId;
    const userId = request.user?.id;

    if (!roomId || !userId) {
      throw new ForbiddenException('Room ID and user ID are required');
    }

    const roomState = await this.baseRoomService.getRoomState(roomId);
    if (!roomState) {
      throw new ForbiddenException('Room not found');
    }

    const participant = roomState.participants.get(userId);
    if (!participant) {
      throw new ForbiddenException('User is not a participant in this room');
    }

    // Check permissions
    const hasPermission = requiredPermissions.some(permission => {
      switch (permission) {
        case RoomPermission.HOST:
          return participant.role === ParticipantRole.HOST;
        case RoomPermission.MODERATOR:
          return (
            participant.role === ParticipantRole.HOST ||
            participant.role === ParticipantRole.MODERATOR
          );
        case RoomPermission.PARTICIPANT:
          return true;
        default:
          return false;
      }
    });

    if (!hasPermission) {
      throw new ForbiddenException('Insufficient permissions for this room');
    }

    return true;
  }
}

