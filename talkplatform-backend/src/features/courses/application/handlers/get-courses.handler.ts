import { Injectable, Logger } from '@nestjs/common';
import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';
import { GetCoursesQuery } from '../queries/get-courses.query';
import { CourseRepository } from '../../infrastructure/repositories/course.repository';
import { Course } from '../../entities/course.entity';

export interface GetCoursesResult {
  courses: Course[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@Injectable()
@QueryHandler(GetCoursesQuery)
export class GetCoursesHandler implements IQueryHandler<GetCoursesQuery> {
  private readonly logger = new Logger(GetCoursesHandler.name);

  constructor(private readonly courseRepository: CourseRepository) {}

  async execute(query: GetCoursesQuery): Promise<GetCoursesResult> {
    const page = query.pagination?.page || 1;
    const limit = query.pagination?.limit || 10;

    this.logger.log(`Getting courses with filters: ${JSON.stringify(query.filters)}`);

    const result = await this.courseRepository.findWithFilters(
      query.filters || {},
      { page, limit },
    );

    return {
      courses: result.courses.map(agg => agg.entity),
      total: result.total,
      page,
      limit,
      totalPages: Math.ceil(result.total / limit),
    };
  }
}

