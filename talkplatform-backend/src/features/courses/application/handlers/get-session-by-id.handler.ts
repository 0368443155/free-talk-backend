import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GetSessionByIdQuery } from '../queries/get-session-by-id.query';
import { CourseSession } from '../../entities/course-session.entity';

@Injectable()
@QueryHandler(GetSessionByIdQuery)
export class GetSessionByIdHandler implements IQueryHandler<GetSessionByIdQuery> {
  private readonly logger = new Logger(GetSessionByIdHandler.name);

  constructor(
    @InjectRepository(CourseSession)
    private readonly sessionRepository: Repository<CourseSession>,
  ) {}

  async execute(query: GetSessionByIdQuery): Promise<CourseSession> {
    this.logger.log(`Getting session ${query.sessionId}`);

    const session = await this.sessionRepository.findOne({
      where: { id: query.sessionId },
      relations: ['course', 'course.teacher'],
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    return session;
  }
}


