import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DeleteLessonCommand } from '../commands/delete-lesson.command';
import { Lesson } from '../../entities/lesson.entity';
import { CourseSession } from '../../entities/course-session.entity';

@Injectable()
@CommandHandler(DeleteLessonCommand)
export class DeleteLessonHandler implements ICommandHandler<DeleteLessonCommand> {
  private readonly logger = new Logger(DeleteLessonHandler.name);

  constructor(
    @InjectRepository(Lesson)
    private readonly lessonRepository: Repository<Lesson>,
    @InjectRepository(CourseSession)
    private readonly sessionRepository: Repository<CourseSession>,
  ) {}

  async execute(command: DeleteLessonCommand): Promise<void> {
    this.logger.log(`Deleting lesson ${command.lessonId} by teacher ${command.teacherId}`);

    // Load lesson with session and course relations
    const lesson = await this.lessonRepository.findOne({
      where: { id: command.lessonId },
      relations: ['session', 'session.course'],
    });

    if (!lesson) {
      throw new NotFoundException('Lesson not found');
    }

    // Verify ownership
    if (lesson.session.course.teacher_id !== command.teacherId) {
      throw new ForbiddenException('You can only delete lessons of your own courses');
    }

    const sessionId = lesson.session_id;

    // Delete lesson
    await this.lessonRepository.delete(command.lessonId);

    // Update session total_lessons
    const session = await this.sessionRepository.findOne({
      where: { id: sessionId },
    });

    if (session) {
      session.total_lessons = Math.max(0, (session.total_lessons || 0) - 1);
      await this.sessionRepository.save(session);
    }

    this.logger.log(`Lesson ${command.lessonId} deleted successfully`);
  }
}


