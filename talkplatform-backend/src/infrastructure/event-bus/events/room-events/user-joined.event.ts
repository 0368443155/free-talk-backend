import { IEvent } from '../../interfaces/event.interface';
import { v4 as uuidv4 } from 'uuid';

export interface UserJoinedRoomEventPayload {
  roomId: string;
  userId: string;
  username: string;
  role: string;
  joinedAt: Date;
}

export class UserJoinedRoomEvent implements IEvent {
  id: string;
  type: string = 'room.user.joined';
  timestamp: Date;
  payload: UserJoinedRoomEventPayload;
  metadata?: Record<string, any>;

  constructor(payload: UserJoinedRoomEventPayload, metadata?: Record<string, any>) {
    this.id = uuidv4();
    this.timestamp = new Date();
    this.payload = payload;
    this.metadata = metadata;
  }
}

