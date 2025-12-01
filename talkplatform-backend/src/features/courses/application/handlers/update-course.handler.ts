import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { UpdateCourseCommand } from '../commands/update-course.command';
import { CourseRepository } from '../../infrastructure/repositories/course.repository';
import { CourseAggregate } from '../../domain/course.aggregate';
import { PriceType } from '../../entities/course.entity';

@Injectable()
@CommandHandler(UpdateCourseCommand)
export class UpdateCourseHandler implements ICommandHandler<UpdateCourseCommand> {
  private readonly logger = new Logger(UpdateCourseHandler.name);

  constructor(private readonly courseRepository: CourseRepository) {}

  async execute(command: UpdateCourseCommand): Promise<CourseAggregate> {
    this.logger.log(`Updating course ${command.courseId} by teacher ${command.teacherId}`);

    // Load course aggregate
    const courseAggregate = await this.courseRepository.findById(command.courseId);

    if (!courseAggregate) {
      throw new NotFoundException('Course not found');
    }

    // Verify ownership
    if (courseAggregate.teacherId !== command.teacherId) {
      throw new ForbiddenException('You can only update your own courses');
    }

    // Validate pricing if provided
    if (command.dto.price_type) {
      if (
        command.dto.price_type === PriceType.PER_SESSION &&
        command.dto.price_per_session &&
        command.dto.price_per_session < 1
      ) {
        throw new BadRequestException('Price per session must be at least $1.00');
      }
      if (
        command.dto.price_type === PriceType.FULL_COURSE &&
        command.dto.price_full_course &&
        command.dto.price_full_course < 1
      ) {
        throw new BadRequestException('Full course price must be at least $1.00');
      }
    }

    // Update course properties
    const course = courseAggregate.entity;
    if (command.dto.title !== undefined) course.title = command.dto.title;
    if (command.dto.description !== undefined) course.description = command.dto.description;
    if (command.dto.category !== undefined) course.category = command.dto.category as any;
    if (command.dto.level !== undefined) course.level = command.dto.level as any;
    if (command.dto.language !== undefined) course.language = command.dto.language;
    if (command.dto.tags !== undefined) course.tags = command.dto.tags;
    if (command.dto.max_students !== undefined) course.max_students = command.dto.max_students;
    if (command.dto.duration_hours !== undefined) course.duration_hours = command.dto.duration_hours;
    if (command.dto.price_type !== undefined) course.price_type = command.dto.price_type;
    if (command.dto.price_per_session !== undefined) {
      course.price_per_session = command.dto.price_per_session;
    }
    if (command.dto.price_full_course !== undefined) {
      course.price_full_course = command.dto.price_full_course;
    }

    // Save changes
    const updatedAggregate = await this.courseRepository.save(courseAggregate);

    this.logger.log(`Course ${command.courseId} updated successfully`);

    return updatedAggregate;
  }
}


