import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { PaymentCheckerService } from '../services/payment-checker.service';

@Injectable()
export class PaymentGuard implements CanActivate {
  constructor(private readonly paymentChecker: PaymentCheckerService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const roomId = request.params?.roomId || request.body?.roomId;
    const userId = request.user?.id;
    const requiredCredits = request.body?.requiredCredits || 0;

    if (!roomId || !userId) {
      throw new ForbiddenException('Room ID and user ID are required');
    }

    const result = await this.paymentChecker.check(userId, roomId, requiredCredits);
    if (!result.granted) {
      throw new ForbiddenException(result.reason || 'Payment required');
    }

    return true;
  }
}

