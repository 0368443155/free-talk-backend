import { Injectable, Logger } from '@nestjs/common';
import { EventsHandler } from '../decorators/events-handler.decorator';
import { IEventHandler } from '../interfaces/event.interface';
import {
  PaymentCompletedEvent,
  RefundIssuedEvent,
} from '../events/payment-events';

@Injectable()
@EventsHandler(PaymentCompletedEvent, RefundIssuedEvent)
export class PaymentEventHandlers implements IEventHandler {
  private readonly logger = new Logger(PaymentEventHandlers.name);

  async handle(event: PaymentCompletedEvent | RefundIssuedEvent): Promise<void> {
    switch (event.type) {
      case 'payment.completed':
        await this.handlePaymentCompleted(event as PaymentCompletedEvent);
        break;
      case 'payment.refund.issued':
        await this.handleRefundIssued(event as RefundIssuedEvent);
        break;
    }
  }

  private async handlePaymentCompleted(event: PaymentCompletedEvent): Promise<void> {
    this.logger.log(`Payment completed: ${event.payload.transactionId} for user ${event.payload.userId}`);
    // Add email notifications, analytics, etc.
  }

  private async handleRefundIssued(event: RefundIssuedEvent): Promise<void> {
    this.logger.log(`Refund issued: ${event.payload.refundId} for transaction ${event.payload.transactionId}`);
    // Add email notifications, analytics, etc.
  }
}

