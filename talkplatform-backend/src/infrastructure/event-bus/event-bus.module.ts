import { Module, OnModuleInit } from '@nestjs/common';
import { EventBusService } from './services/event-bus.service';
import { RoomCreatedEventHandler } from './handlers/room-event.handlers';
import { UserJoinedRoomEventHandler } from './handlers/user-joined-room-event.handlers';
import { UserLeftRoomEventHandler } from './handlers/user-left-room-event.handlers';
import { RoomEndedEventHandler } from './handlers/room-ended-event.handlers';
import { PaymentCompletedEventHandler } from './handlers/payment-event.handlers';
import { RefundIssuedEventHandler } from './handlers/refund-issued-event.handlers';
import { CoursePublishedEventHandler } from './handlers/course-event.handlers';
import { LessonCompletedEventHandler } from './handlers/lesson-completed-event.handlers';

@Module({
  providers: [
    EventBusService,
    RoomCreatedEventHandler,
    UserJoinedRoomEventHandler,
    UserLeftRoomEventHandler,
    RoomEndedEventHandler,
    PaymentCompletedEventHandler,
    RefundIssuedEventHandler,
    CoursePublishedEventHandler,
    LessonCompletedEventHandler,
  ],
  exports: [EventBusService],
})
export class EventBusModule implements OnModuleInit {
  constructor(private readonly eventBus: EventBusService) {}

  onModuleInit() {
    // Register all event handlers
    this.eventBus.registerHandlers(RoomCreatedEventHandler);
    this.eventBus.registerHandlers(UserJoinedRoomEventHandler);
    this.eventBus.registerHandlers(UserLeftRoomEventHandler);
    this.eventBus.registerHandlers(RoomEndedEventHandler);
    this.eventBus.registerHandlers(PaymentCompletedEventHandler);
    this.eventBus.registerHandlers(RefundIssuedEventHandler);
    this.eventBus.registerHandlers(CoursePublishedEventHandler);
    this.eventBus.registerHandlers(LessonCompletedEventHandler);
  }
}

