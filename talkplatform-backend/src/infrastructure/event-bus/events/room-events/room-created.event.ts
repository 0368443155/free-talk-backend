import { IEvent } from '../../interfaces/event.interface';
import { v4 as uuidv4 } from 'uuid';

export interface RoomCreatedEventPayload {
  roomId: string;
  roomType: string;
  hostId: string;
  createdAt: Date;
}

export class RoomCreatedEvent implements IEvent {
  id: string;
  type: string = 'room.created';
  timestamp: Date;
  payload: RoomCreatedEventPayload;
  metadata?: Record<string, any>;

  constructor(payload: RoomCreatedEventPayload, metadata?: Record<string, any>) {
    this.id = uuidv4();
    this.timestamp = new Date();
    this.payload = payload;
    this.metadata = metadata;
  }
}

