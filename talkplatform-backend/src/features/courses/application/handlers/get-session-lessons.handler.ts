import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GetSessionLessonsQuery } from '../queries/get-session-lessons.query';
import { Lesson } from '../../entities/lesson.entity';
import { CourseSession } from '../../entities/course-session.entity';

@Injectable()
@QueryHandler(GetSessionLessonsQuery)
export class GetSessionLessonsHandler implements IQueryHandler<GetSessionLessonsQuery> {
  private readonly logger = new Logger(GetSessionLessonsHandler.name);

  constructor(
    @InjectRepository(Lesson)
    private readonly lessonRepository: Repository<Lesson>,
    @InjectRepository(CourseSession)
    private readonly sessionRepository: Repository<CourseSession>,
  ) {}

  async execute(query: GetSessionLessonsQuery): Promise<Lesson[]> {
    this.logger.log(`Getting lessons for session ${query.sessionId}`);

    // Verify session exists
    const session = await this.sessionRepository.findOne({
      where: { id: query.sessionId },
    });

    if (!session) {
      throw new NotFoundException(`Session with ID ${query.sessionId} not found`);
    }

    // Get lessons
    const lessons = await this.lessonRepository.find({
      where: { session_id: query.sessionId },
      relations: ['materials', 'meeting'],
      order: { lesson_number: 'ASC' },
    });

    return lessons;
  }
}


