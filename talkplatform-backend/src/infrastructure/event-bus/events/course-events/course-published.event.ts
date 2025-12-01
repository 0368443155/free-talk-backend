import { IEvent } from '../../interfaces/event.interface';
import { v4 as uuidv4 } from 'uuid';

export interface CoursePublishedEventPayload {
  courseId: string;
  teacherId: string;
  courseTitle: string;
  publishedAt: Date;
}

export class CoursePublishedEvent implements IEvent {
  id: string;
  type: string = 'course.published';
  timestamp: Date;
  payload: CoursePublishedEventPayload;
  metadata?: Record<string, any>;

  constructor(payload: CoursePublishedEventPayload, metadata?: Record<string, any>) {
    this.id = uuidv4();
    this.timestamp = new Date();
    this.payload = payload;
    this.metadata = metadata;
  }
}

