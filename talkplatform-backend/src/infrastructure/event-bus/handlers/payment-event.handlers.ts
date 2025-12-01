import { Injectable, Logger } from '@nestjs/common';
import { EventsHandler } from '../decorators/events-handler.decorator';
import { IEventHandler } from '../interfaces/event.interface';
import {
  PaymentCompletedEvent,
  RefundIssuedEvent,
} from '../events/payment-events';

@Injectable()
@EventsHandler(PaymentCompletedEvent)
export class PaymentCompletedEventHandler implements IEventHandler {
  private readonly logger = new Logger(PaymentCompletedEventHandler.name);

  async handle(event: PaymentCompletedEvent): Promise<void> {
    await this.handlePaymentCompleted(event);
  }

  private async handlePaymentCompleted(event: PaymentCompletedEvent): Promise<void> {
    this.logger.log(`Payment completed: ${event.payload.transactionId} for user ${event.payload.userId}`);
    // Add email notifications, analytics, etc.
  }
}

