import { IEvent } from '../../interfaces/event.interface';
import { v4 as uuidv4 } from 'uuid';

export interface RoomEndedEventPayload {
  roomId: string;
  roomType: string;
  hostId: string;
  endedAt: Date;
  duration?: number; // Duration in seconds
  participantCount?: number;
}

export class RoomEndedEvent implements IEvent {
  id: string;
  type: string = 'room.ended';
  timestamp: Date;
  payload: RoomEndedEventPayload;
  metadata?: Record<string, any>;

  constructor(payload: RoomEndedEventPayload, metadata?: Record<string, any>) {
    this.id = uuidv4();
    this.timestamp = new Date();
    this.payload = payload;
    this.metadata = metadata;
  }
}

