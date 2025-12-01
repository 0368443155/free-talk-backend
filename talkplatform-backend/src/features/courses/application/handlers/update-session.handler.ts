import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UpdateSessionCommand } from '../commands/update-session.command';
import { CourseSession } from '../../entities/course-session.entity';

@Injectable()
@CommandHandler(UpdateSessionCommand)
export class UpdateSessionHandler implements ICommandHandler<UpdateSessionCommand> {
  private readonly logger = new Logger(UpdateSessionHandler.name);

  constructor(
    @InjectRepository(CourseSession)
    private readonly sessionRepository: Repository<CourseSession>,
  ) {}

  async execute(command: UpdateSessionCommand): Promise<CourseSession> {
    this.logger.log(`Updating session ${command.sessionId} by teacher ${command.teacherId}`);

    // Load session with course relation
    const session = await this.sessionRepository.findOne({
      where: { id: command.sessionId },
      relations: ['course', 'course.teacher'],
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    // Verify ownership
    if (session.course.teacher_id !== command.teacherId) {
      throw new ForbiddenException('You can only update sessions of your own courses');
    }

    // Update session properties
    if (command.dto.title !== undefined) session.title = command.dto.title;
    if (command.dto.description !== undefined) session.description = command.dto.description;

    // Save changes
    const updatedSession = await this.sessionRepository.save(session);

    this.logger.log(`Session ${command.sessionId} updated successfully`);

    return updatedSession;
  }
}


