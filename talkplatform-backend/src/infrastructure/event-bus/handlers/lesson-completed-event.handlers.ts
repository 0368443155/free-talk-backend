import { Injectable, Logger } from '@nestjs/common';
import { EventsHandler } from '../decorators/events-handler.decorator';
import { IEventHandler } from '../interfaces/event.interface';
import { LessonCompletedEvent } from '../events/course-events';

@Injectable()
@EventsHandler(LessonCompletedEvent)
export class LessonCompletedEventHandler implements IEventHandler {
  private readonly logger = new Logger(LessonCompletedEventHandler.name);

  async handle(event: LessonCompletedEvent): Promise<void> {
    await this.handleLessonCompleted(event);
  }

  private async handleLessonCompleted(event: LessonCompletedEvent): Promise<void> {
    this.logger.log(`Lesson completed: ${event.payload.lessonId} by user ${event.payload.userId}`);
    // Add progress tracking, notifications, etc.
  }
}

