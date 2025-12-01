import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { CreditManagerService } from '../services/credit-manager.service';

@Injectable()
export class HasCreditsGuard implements CanActivate {
  constructor(private readonly creditManager: CreditManagerService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const userId = request.user?.id;
    const requiredCredits = request.body?.requiredCredits || request.query?.requiredCredits || 0;

    if (!userId) {
      throw new ForbiddenException('User ID is required');
    }

    const hasCredits = await this.creditManager.hasSufficientCredits(
      userId,
      requiredCredits,
    );

    if (!hasCredits) {
      const balance = await this.creditManager.getBalance(userId);
      throw new ForbiddenException(
        `Insufficient credits. Required: ${requiredCredits}, Available: ${balance}`,
      );
    }

    return true;
  }
}

