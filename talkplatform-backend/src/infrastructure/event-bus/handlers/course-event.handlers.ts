import { Injectable, Logger } from '@nestjs/common';
import { EventsHandler } from '../decorators/events-handler.decorator';
import { IEventHandler } from '../interfaces/event.interface';
import {
  CoursePublishedEvent,
  LessonCompletedEvent,
} from '../events/course-events';

@Injectable()
@EventsHandler(CoursePublishedEvent)
export class CoursePublishedEventHandler implements IEventHandler {
  private readonly logger = new Logger(CoursePublishedEventHandler.name);

  async handle(event: CoursePublishedEvent): Promise<void> {
    await this.handleCoursePublished(event);
  }

  private async handleCoursePublished(event: CoursePublishedEvent): Promise<void> {
    this.logger.log(`Course published: ${event.payload.courseId} by teacher ${event.payload.teacherId}`);
    // Add notifications, analytics, etc.
  }
}

