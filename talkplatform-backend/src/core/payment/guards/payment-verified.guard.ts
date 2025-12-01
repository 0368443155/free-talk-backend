import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { TransactionManagerService } from '../services/transaction-manager.service';
import { TransactionStatus } from '../../../features/credits/entities/credit-transaction.entity';

@Injectable()
export class PaymentVerifiedGuard implements CanActivate {
  constructor(private readonly transactionManager: TransactionManagerService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const transactionId = request.body?.transactionId || request.params?.transactionId;

    if (!transactionId) {
      throw new ForbiddenException('Transaction ID is required');
    }

    const transaction = await this.transactionManager.getTransaction(transactionId);
    
    if (!transaction) {
      throw new ForbiddenException('Transaction not found');
    }

    if (transaction.status !== TransactionStatus.COMPLETED) {
      throw new ForbiddenException('Payment not verified');
    }

    return true;
  }
}

