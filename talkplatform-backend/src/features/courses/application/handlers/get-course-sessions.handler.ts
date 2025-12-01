import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GetCourseSessionsQuery } from '../queries/get-course-sessions.query';
import { CourseSession } from '../../entities/course-session.entity';
import { Course } from '../../entities/course.entity';

@Injectable()
@QueryHandler(GetCourseSessionsQuery)
export class GetCourseSessionsHandler implements IQueryHandler<GetCourseSessionsQuery> {
  private readonly logger = new Logger(GetCourseSessionsHandler.name);

  constructor(
    @InjectRepository(CourseSession)
    private readonly sessionRepository: Repository<CourseSession>,
    @InjectRepository(Course)
    private readonly courseRepository: Repository<Course>,
  ) {}

  async execute(query: GetCourseSessionsQuery): Promise<CourseSession[]> {
    this.logger.log(`Getting sessions for course ${query.courseId}`);

    // Verify course exists
    const course = await this.courseRepository.findOne({
      where: { id: query.courseId },
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    // Get sessions
    const sessions = await this.sessionRepository.find({
      where: { course_id: query.courseId },
      order: { session_number: 'ASC' },
    });

    return sessions;
  }
}


