import { IEvent } from '../../interfaces/event.interface';
import { v4 as uuidv4 } from 'uuid';

export interface UserLeftRoomEventPayload {
  roomId: string;
  userId: string;
  username: string;
  leftAt: Date;
  duration?: number; // Duration in seconds
}

export class UserLeftRoomEvent implements IEvent {
  id: string;
  type: string = 'room.user.left';
  timestamp: Date;
  payload: UserLeftRoomEventPayload;
  metadata?: Record<string, any>;

  constructor(payload: UserLeftRoomEventPayload, metadata?: Record<string, any>) {
    this.id = uuidv4();
    this.timestamp = new Date();
    this.payload = payload;
    this.metadata = metadata;
  }
}

