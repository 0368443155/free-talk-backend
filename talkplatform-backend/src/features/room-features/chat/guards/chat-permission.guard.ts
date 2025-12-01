import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { BaseRoomService } from '../../../../core/room/services/base-room.service';
import { RoomFeature } from '../../../../core/room/enums/room-feature.enum';

@Injectable()
export class ChatPermissionGuard implements CanActivate {
  constructor(private readonly baseRoomService: BaseRoomService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const roomId = request.params?.roomId || request.body?.roomId;

    if (!roomId) {
      throw new ForbiddenException('Room ID is required');
    }

    const hasChat = await this.baseRoomService.hasFeature(roomId, RoomFeature.CHAT);
    if (!hasChat) {
      throw new ForbiddenException('Chat is disabled in this room');
    }

    return true;
  }
}

