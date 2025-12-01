import { Module, OnModuleInit } from '@nestjs/common';
import { EventBusService } from './services/event-bus.service';
import { RoomEventHandlers } from './handlers/room-event.handlers';
import { PaymentEventHandlers } from './handlers/payment-event.handlers';
import { CourseEventHandlers } from './handlers/course-event.handlers';

@Module({
  providers: [
    EventBusService,
    RoomEventHandlers,
    PaymentEventHandlers,
    CourseEventHandlers,
  ],
  exports: [EventBusService],
})
export class EventBusModule implements OnModuleInit {
  constructor(private readonly eventBus: EventBusService) {}

  onModuleInit() {
    // Register all event handlers
    this.eventBus.registerHandlers(RoomEventHandlers);
    this.eventBus.registerHandlers(PaymentEventHandlers);
    this.eventBus.registerHandlers(CourseEventHandlers);
  }
}

