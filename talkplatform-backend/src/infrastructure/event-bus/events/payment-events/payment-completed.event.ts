import { IEvent } from '../../interfaces/event.interface';
import { v4 as uuidv4 } from 'uuid';

export interface PaymentCompletedEventPayload {
  transactionId: string;
  userId: string;
  amount: number;
  currency: string;
  paymentProvider: string;
  completedAt: Date;
}

export class PaymentCompletedEvent implements IEvent {
  id: string;
  type: string = 'payment.completed';
  timestamp: Date;
  payload: PaymentCompletedEventPayload;
  metadata?: Record<string, any>;

  constructor(payload: PaymentCompletedEventPayload, metadata?: Record<string, any>) {
    this.id = uuidv4();
    this.timestamp = new Date();
    this.payload = payload;
    this.metadata = metadata;
  }
}

