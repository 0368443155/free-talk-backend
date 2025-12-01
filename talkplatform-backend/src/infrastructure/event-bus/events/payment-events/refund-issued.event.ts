import { IEvent } from '../../interfaces/event.interface';
import { v4 as uuidv4 } from 'uuid';

export interface RefundIssuedEventPayload {
  refundId: string;
  transactionId: string;
  userId: string;
  amount: number;
  reason?: string;
  issuedAt: Date;
}

export class RefundIssuedEvent implements IEvent {
  id: string;
  type: string = 'payment.refund.issued';
  timestamp: Date;
  payload: RefundIssuedEventPayload;
  metadata?: Record<string, any>;

  constructor(payload: RefundIssuedEventPayload, metadata?: Record<string, any>) {
    this.id = uuidv4();
    this.timestamp = new Date();
    this.payload = payload;
    this.metadata = metadata;
  }
}

