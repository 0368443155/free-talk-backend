import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { UnpublishCourseCommand } from '../commands/unpublish-course.command';
import { CourseRepository } from '../../infrastructure/repositories/course.repository';
import { CourseStatus } from '../../entities/course.entity';

@Injectable()
@CommandHandler(UnpublishCourseCommand)
export class UnpublishCourseHandler implements ICommandHandler<UnpublishCourseCommand> {
  private readonly logger = new Logger(UnpublishCourseHandler.name);

  constructor(private readonly courseRepository: CourseRepository) {}

  async execute(command: UnpublishCourseCommand): Promise<void> {
    this.logger.log(
      `Unpublishing course ${command.courseId} by teacher ${command.teacherId}`,
    );

    // Load course aggregate
    const courseAggregate = await this.courseRepository.findById(command.courseId);

    if (!courseAggregate) {
      throw new NotFoundException('Course not found');
    }

    // Verify ownership
    if (courseAggregate.teacherId !== command.teacherId) {
      throw new ForbiddenException('You can only unpublish your own courses');
    }

    // Unpublish course
    const course = courseAggregate.entity;
    course.is_published = false;
    if (course.status === CourseStatus.PUBLISHED) {
      course.status = CourseStatus.DRAFT;
    }

    // Save changes
    await this.courseRepository.save(courseAggregate);

    this.logger.log(`Course ${command.courseId} unpublished successfully`);
  }
}


