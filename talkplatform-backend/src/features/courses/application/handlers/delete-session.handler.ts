import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DeleteSessionCommand } from '../commands/delete-session.command';
import { CourseSession } from '../../entities/course-session.entity';
import { CourseRepository } from '../../infrastructure/repositories/course.repository';

@Injectable()
@CommandHandler(DeleteSessionCommand)
export class DeleteSessionHandler implements ICommandHandler<DeleteSessionCommand> {
  private readonly logger = new Logger(DeleteSessionHandler.name);

  constructor(
    @InjectRepository(CourseSession)
    private readonly sessionRepository: Repository<CourseSession>,
    private readonly courseRepository: CourseRepository,
  ) {}

  async execute(command: DeleteSessionCommand): Promise<void> {
    this.logger.log(`Deleting session ${command.sessionId} by teacher ${command.teacherId}`);

    // Load session with course relation
    const session = await this.sessionRepository.findOne({
      where: { id: command.sessionId },
      relations: ['course'],
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    // Verify ownership
    if (session.course.teacher_id !== command.teacherId) {
      throw new ForbiddenException('You can only delete sessions of your own courses');
    }

    const courseId = session.course_id;

    // Delete session
    await this.sessionRepository.delete(command.sessionId);

    // Update course total_sessions
    const courseAggregate = await this.courseRepository.findById(courseId);
    if (courseAggregate) {
      const course = courseAggregate.entity;
      course.total_sessions = Math.max(0, (course.total_sessions || 0) - 1);
      await this.courseRepository.save(courseAggregate);
    }

    this.logger.log(`Session ${command.sessionId} deleted successfully`);
  }
}


