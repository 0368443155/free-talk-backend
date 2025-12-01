import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { CapacityCheckerService } from '../services/capacity-checker.service';

@Injectable()
export class CapacityGuard implements CanActivate {
  constructor(private readonly capacityChecker: CapacityCheckerService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const roomId = request.params?.roomId || request.body?.roomId;
    const maxParticipants = request.body?.maxParticipants || 100;

    if (!roomId) {
      throw new ForbiddenException('Room ID is required');
    }

    const result = await this.capacityChecker.check(roomId, maxParticipants);
    if (!result.granted) {
      throw new ForbiddenException(result.reason || 'Room is full');
    }

    return true;
  }
}

