import { Injectable, Logger } from '@nestjs/common';
import { EventsHandler } from '../decorators/events-handler.decorator';
import { IEventHandler } from '../interfaces/event.interface';
import {
  RoomCreatedEvent,
  UserJoinedRoomEvent,
  UserLeftRoomEvent,
  RoomEndedEvent,
} from '../events/room-events';

@Injectable()
@EventsHandler(RoomCreatedEvent)
export class RoomCreatedEventHandler implements IEventHandler {
  private readonly logger = new Logger(RoomCreatedEventHandler.name);

  async handle(event: RoomCreatedEvent): Promise<void> {
    await this.handleRoomCreated(event);
  }

  private async handleRoomCreated(event: RoomCreatedEvent): Promise<void> {
    this.logger.log(`Room created: ${event.payload.roomId} (${event.payload.roomType})`);
    // Add analytics tracking, notifications, etc.
  }
}

