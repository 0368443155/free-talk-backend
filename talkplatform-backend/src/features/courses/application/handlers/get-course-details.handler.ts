import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';
import { GetCourseDetailsQuery } from '../queries/get-course-details.query';
import { CourseRepository } from '../../infrastructure/repositories/course.repository';
import { Course } from '../../entities/course.entity';

@Injectable()
@QueryHandler(GetCourseDetailsQuery)
export class GetCourseDetailsHandler implements IQueryHandler<GetCourseDetailsQuery> {
  private readonly logger = new Logger(GetCourseDetailsHandler.name);

  constructor(private readonly courseRepository: CourseRepository) {}

  async execute(query: GetCourseDetailsQuery): Promise<Course> {
    this.logger.log(`Getting course details for ${query.courseId}`);

    const courseAggregate = await this.courseRepository.findById(
      query.courseId,
      query.includeSessions,
    );

    if (!courseAggregate) {
      throw new NotFoundException('Course not found');
    }

    return courseAggregate.entity;
  }
}

