import { Injectable, Logger } from '@nestjs/common';
import { EventsHandler } from '../decorators/events-handler.decorator';
import { IEventHandler } from '../interfaces/event.interface';
import { RoomEndedEvent } from '../events/room-events';

@Injectable()
@EventsHandler(RoomEndedEvent)
export class RoomEndedEventHandler implements IEventHandler {
  private readonly logger = new Logger(RoomEndedEventHandler.name);

  async handle(event: RoomEndedEvent): Promise<void> {
    await this.handleRoomEnded(event);
  }

  private async handleRoomEnded(event: RoomEndedEvent): Promise<void> {
    this.logger.log(`Room ended: ${event.payload.roomId}`);
    // Add analytics tracking, cleanup, notifications, etc.
  }
}

