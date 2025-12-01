import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { BaseRoomService } from '../services/base-room.service';
import { ROOM_FEATURE_KEY } from '../decorators/room-feature.decorator';
import { RoomFeature } from '../enums/room-feature.enum';

@Injectable()
export class RoomFeatureGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly baseRoomService: BaseRoomService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredFeatures = this.reflector.getAllAndOverride<RoomFeature[]>(
      ROOM_FEATURE_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredFeatures || requiredFeatures.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const roomId = request.params?.roomId || request.body?.roomId || request.query?.roomId;

    if (!roomId) {
      throw new ForbiddenException('Room ID is required');
    }

    // Check if room has all required features
    for (const feature of requiredFeatures) {
      const hasFeature = await this.baseRoomService.hasFeature(roomId, feature);
      if (!hasFeature) {
        throw new ForbiddenException(
          `Room does not have required feature: ${feature}`,
        );
      }
    }

    return true;
  }
}

