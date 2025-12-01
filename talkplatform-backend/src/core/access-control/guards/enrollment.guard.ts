import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { EnrollmentCheckerService } from '../services/enrollment-checker.service';

@Injectable()
export class EnrollmentGuard implements CanActivate {
  constructor(private readonly enrollmentChecker: EnrollmentCheckerService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const roomId = request.params?.roomId || request.body?.roomId;
    const userId = request.user?.id;

    if (!roomId || !userId) {
      throw new ForbiddenException('Room ID and user ID are required');
    }

    const result = await this.enrollmentChecker.check(userId, roomId);
    if (!result.granted) {
      throw new ForbiddenException(result.reason || 'Enrollment required');
    }

    return true;
  }
}

