import { Injectable, Logger } from '@nestjs/common';
import { EventsHandler } from '../decorators/events-handler.decorator';
import { IEventHandler } from '../interfaces/event.interface';
import { UserLeftRoomEvent } from '../events/room-events';

@Injectable()
@EventsHandler(UserLeftRoomEvent)
export class UserLeftRoomEventHandler implements IEventHandler {
  private readonly logger = new Logger(UserLeftRoomEventHandler.name);

  async handle(event: UserLeftRoomEvent): Promise<void> {
    await this.handleUserLeft(event);
  }

  private async handleUserLeft(event: UserLeftRoomEvent): Promise<void> {
    this.logger.log(`User left room: ${event.payload.userId} -> ${event.payload.roomId}`);
    // Add analytics tracking, cleanup, etc.
  }
}

