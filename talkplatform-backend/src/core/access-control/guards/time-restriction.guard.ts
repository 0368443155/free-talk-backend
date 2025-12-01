import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { TimeBasedAccessService } from '../services/time-based-access.service';

@Injectable()
export class TimeRestrictionGuard implements CanActivate {
  constructor(private readonly timeBasedAccess: TimeBasedAccessService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const roomId = request.params?.roomId || request.body?.roomId;

    if (!roomId) {
      throw new ForbiddenException('Room ID is required');
    }

    const result = await this.timeBasedAccess.check(roomId);
    if (!result.granted) {
      throw new ForbiddenException(result.reason || 'Room is not accessible at this time');
    }

    return true;
  }
}

