import { Injectable, Logger } from '@nestjs/common';
import { EventsHandler } from '../decorators/events-handler.decorator';
import { IEventHandler } from '../interfaces/event.interface';
import { RefundIssuedEvent } from '../events/payment-events';

@Injectable()
@EventsHandler(RefundIssuedEvent)
export class RefundIssuedEventHandler implements IEventHandler {
  private readonly logger = new Logger(RefundIssuedEventHandler.name);

  async handle(event: RefundIssuedEvent): Promise<void> {
    await this.handleRefundIssued(event);
  }

  private async handleRefundIssued(event: RefundIssuedEvent): Promise<void> {
    this.logger.log(`Refund issued: ${event.payload.refundId} for transaction ${event.payload.transactionId}`);
    // Add email notifications, analytics, etc.
  }
}

