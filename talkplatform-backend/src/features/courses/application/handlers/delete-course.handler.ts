import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { DeleteCourseCommand } from '../commands/delete-course.command';
import { CourseRepository } from '../../infrastructure/repositories/course.repository';

@Injectable()
@CommandHandler(DeleteCourseCommand)
export class DeleteCourseHandler implements ICommandHandler<DeleteCourseCommand> {
  private readonly logger = new Logger(DeleteCourseHandler.name);

  constructor(private readonly courseRepository: CourseRepository) {}

  async execute(command: DeleteCourseCommand): Promise<void> {
    this.logger.log(`Deleting course ${command.courseId} by teacher ${command.teacherId}`);

    // Load course aggregate
    const courseAggregate = await this.courseRepository.findById(command.courseId);

    if (!courseAggregate) {
      throw new NotFoundException('Course not found');
    }

    // Verify ownership
    if (courseAggregate.teacherId !== command.teacherId) {
      throw new ForbiddenException('You can only delete your own courses');
    }

    // Check if course has enrolled students
    if (courseAggregate.currentStudents > 0) {
      throw new BadRequestException('Cannot delete course with enrolled students');
    }

    // Delete course
    await this.courseRepository.delete(command.courseId);

    this.logger.log(`Course ${command.courseId} deleted successfully`);
  }
}


