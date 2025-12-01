import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AddSessionCommand } from '../commands/add-session.command';
import { CourseRepository } from '../../infrastructure/repositories/course.repository';
import { CourseSession, SessionStatus } from '../../entities/course-session.entity';

@Injectable()
@CommandHandler(AddSessionCommand)
export class AddSessionHandler implements ICommandHandler<AddSessionCommand> {
  private readonly logger = new Logger(AddSessionHandler.name);

  constructor(
    private readonly courseRepository: CourseRepository,
    @InjectRepository(CourseSession)
    private readonly sessionRepository: Repository<CourseSession>,
  ) {}

  async execute(command: AddSessionCommand): Promise<CourseSession> {
    this.logger.log(
      `Adding session to course ${command.courseId} by teacher ${command.teacherId}`,
    );

    // Load course aggregate
    const courseAggregate = await this.courseRepository.findById(command.courseId);

    if (!courseAggregate) {
      throw new NotFoundException('Course not found');
    }

    // Verify ownership
    if (courseAggregate.teacherId !== command.teacherId) {
      throw new ForbiddenException('You can only add sessions to your own courses');
    }

    // Check if session number already exists
    const existingSession = await this.sessionRepository.findOne({
      where: {
        course_id: command.courseId,
        session_number: command.dto.session_number,
      },
    });

    if (existingSession) {
      throw new BadRequestException(
        `Session number ${command.dto.session_number} already exists`,
      );
    }

    // Validate scheduled_date if provided (for backward compatibility)
    if (command.dto.scheduled_date) {
      const sessionDate = new Date(command.dto.scheduled_date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (sessionDate < today) {
        throw new BadRequestException('Session date must be in the future');
      }
    }

    // Create session
    const session = this.sessionRepository.create({
      course_id: command.courseId,
      session_number: command.dto.session_number,
      title: command.dto.title,
      description: command.dto.description,
      total_lessons: 0, // Will be updated when lessons are added
      status: SessionStatus.DRAFT,
    });

    const savedSession = await this.sessionRepository.save(session);

    // Update course total_sessions using aggregate
    const course = courseAggregate.entity;
    course.total_sessions = (course.total_sessions || 0) + 1;
    await this.courseRepository.save(courseAggregate);

    this.logger.log(
      `Session added to course ${command.courseId}: Session #${command.dto.session_number}`,
    );

    return savedSession;
  }
}


