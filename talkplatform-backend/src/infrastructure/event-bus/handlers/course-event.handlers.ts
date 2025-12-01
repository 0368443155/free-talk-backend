import { Injectable, Logger } from '@nestjs/common';
import { EventsHandler } from '../decorators/events-handler.decorator';
import { IEventHandler } from '../interfaces/event.interface';
import {
  CoursePublishedEvent,
  LessonCompletedEvent,
} from '../events/course-events';

@Injectable()
@EventsHandler(CoursePublishedEvent, LessonCompletedEvent)
export class CourseEventHandlers implements IEventHandler {
  private readonly logger = new Logger(CourseEventHandlers.name);

  async handle(event: CoursePublishedEvent | LessonCompletedEvent): Promise<void> {
    switch (event.type) {
      case 'course.published':
        await this.handleCoursePublished(event as CoursePublishedEvent);
        break;
      case 'course.lesson.completed':
        await this.handleLessonCompleted(event as LessonCompletedEvent);
        break;
    }
  }

  private async handleCoursePublished(event: CoursePublishedEvent): Promise<void> {
    this.logger.log(`Course published: ${event.payload.courseId} by teacher ${event.payload.teacherId}`);
    // Add notifications, analytics, etc.
  }

  private async handleLessonCompleted(event: LessonCompletedEvent): Promise<void> {
    this.logger.log(`Lesson completed: ${event.payload.lessonId} by user ${event.payload.userId}`);
    // Add progress tracking, notifications, etc.
  }
}

