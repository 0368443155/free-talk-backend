import { Injectable, Logger, ForbiddenException, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { PublishCourseCommand } from '../commands/publish-course.command';
import { CourseRepository } from '../../infrastructure/repositories/course.repository';
import { EventBusService } from '../../../../infrastructure/event-bus/services/event-bus.service';
import { CoursePublishedEvent } from '../../../../infrastructure/event-bus/events/course-events/course-published.event';

@Injectable()
@CommandHandler(PublishCourseCommand)
export class PublishCourseHandler implements ICommandHandler<PublishCourseCommand> {
  private readonly logger = new Logger(PublishCourseHandler.name);

  constructor(
    private readonly courseRepository: CourseRepository,
    private readonly eventBus: EventBusService,
  ) {}

  async execute(command: PublishCourseCommand): Promise<void> {
    this.logger.log(`Publishing course ${command.courseId} by teacher ${command.teacherId}`);

    // Load course aggregate
    const courseAggregate = await this.courseRepository.findById(command.courseId);

    if (!courseAggregate) {
      throw new NotFoundException('Course not found');
    }

    // Verify ownership
    if (courseAggregate.teacherId !== command.teacherId) {
      throw new ForbiddenException('Only the course owner can publish the course');
    }

    // Publish course
    courseAggregate.publish();

    // Save changes
    await this.courseRepository.save(courseAggregate);

    // Publish event
    await this.eventBus.publish(
      new CoursePublishedEvent({
        courseId: courseAggregate.id,
        teacherId: courseAggregate.teacherId,
        courseTitle: courseAggregate.title,
        publishedAt: new Date(),
      }),
    );

    this.logger.log(`Course ${command.courseId} published successfully`);
  }
}

