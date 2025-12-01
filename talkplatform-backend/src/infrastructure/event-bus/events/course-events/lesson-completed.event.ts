import { IEvent } from '../../interfaces/event.interface';
import { v4 as uuidv4 } from 'uuid';

export interface LessonCompletedEventPayload {
  lessonId: string;
  courseId: string;
  userId: string;
  completedAt: Date;
  score?: number;
}

export class LessonCompletedEvent implements IEvent {
  id: string;
  type: string = 'course.lesson.completed';
  timestamp: Date;
  payload: LessonCompletedEventPayload;
  metadata?: Record<string, any>;

  constructor(payload: LessonCompletedEventPayload, metadata?: Record<string, any>) {
    this.id = uuidv4();
    this.timestamp = new Date();
    this.payload = payload;
    this.metadata = metadata;
  }
}

