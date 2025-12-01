import { Injectable, Logger } from '@nestjs/common';
import { EventsHandler } from '../decorators/events-handler.decorator';
import { IEventHandler } from '../interfaces/event.interface';
import { UserJoinedRoomEvent } from '../events/room-events';

@Injectable()
@EventsHandler(UserJoinedRoomEvent)
export class UserJoinedRoomEventHandler implements IEventHandler {
  private readonly logger = new Logger(UserJoinedRoomEventHandler.name);

  async handle(event: UserJoinedRoomEvent): Promise<void> {
    await this.handleUserJoined(event);
  }

  private async handleUserJoined(event: UserJoinedRoomEvent): Promise<void> {
    this.logger.log(`User joined room: ${event.payload.userId} -> ${event.payload.roomId}`);
    // Add analytics tracking, notifications, etc.
  }
}

