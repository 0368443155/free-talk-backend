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
@EventsHandler(RoomCreatedEvent, UserJoinedRoomEvent, UserLeftRoomEvent, RoomEndedEvent)
export class RoomEventHandlers implements IEventHandler {
  private readonly logger = new Logger(RoomEventHandlers.name);

  async handle(event: RoomCreatedEvent | UserJoinedRoomEvent | UserLeftRoomEvent | RoomEndedEvent): Promise<void> {
    switch (event.type) {
      case 'room.created':
        await this.handleRoomCreated(event as RoomCreatedEvent);
        break;
      case 'room.user.joined':
        await this.handleUserJoined(event as UserJoinedRoomEvent);
        break;
      case 'room.user.left':
        await this.handleUserLeft(event as UserLeftRoomEvent);
        break;
      case 'room.ended':
        await this.handleRoomEnded(event as RoomEndedEvent);
        break;
    }
  }

  private async handleRoomCreated(event: RoomCreatedEvent): Promise<void> {
    this.logger.log(`Room created: ${event.payload.roomId} (${event.payload.roomType})`);
    // Add analytics tracking, notifications, etc.
  }

  private async handleUserJoined(event: UserJoinedRoomEvent): Promise<void> {
    this.logger.log(`User joined room: ${event.payload.userId} -> ${event.payload.roomId}`);
    // Add analytics tracking, notifications, etc.
  }

  private async handleUserLeft(event: UserLeftRoomEvent): Promise<void> {
    this.logger.log(`User left room: ${event.payload.userId} -> ${event.payload.roomId}`);
    // Add analytics tracking, cleanup, etc.
  }

  private async handleRoomEnded(event: RoomEndedEvent): Promise<void> {
    this.logger.log(`Room ended: ${event.payload.roomId}`);
    // Add analytics tracking, cleanup, notifications, etc.
  }
}

