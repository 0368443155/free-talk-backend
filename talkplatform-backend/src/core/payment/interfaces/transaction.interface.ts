import { PaymentStatus } from '../enums/payment-status.enum';
import { TransactionType } from '../enums/transaction-type.enum';

/**
 * Transaction interface
 */
export interface ITransaction {
  id: string;
  userId: string;
  type: TransactionType;
  status: PaymentStatus;
  amount: number;
  currency: string;
  description?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

