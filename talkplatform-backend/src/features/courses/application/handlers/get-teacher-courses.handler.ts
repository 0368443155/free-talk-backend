import { Injectable, Logger } from '@nestjs/common';
import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere } from 'typeorm';
import { GetTeacherCoursesQuery } from '../queries/get-teacher-courses.query';
import { Course, CourseStatus } from '../../entities/course.entity';

@Injectable()
@QueryHandler(GetTeacherCoursesQuery)
export class GetTeacherCoursesHandler implements IQueryHandler<GetTeacherCoursesQuery> {
  private readonly logger = new Logger(GetTeacherCoursesHandler.name);

  constructor(
    @InjectRepository(Course)
    private readonly courseRepository: Repository<Course>,
  ) {}

  async execute(query: GetTeacherCoursesQuery): Promise<Course[]> {
    this.logger.log(`Getting courses for teacher ${query.teacherId}`);

    const where: FindOptionsWhere<Course> = { teacher_id: query.teacherId };
    if (query.status) {
      where.status = query.status;
    }

    const courses = await this.courseRepository.find({
      where,
      relations: ['sessions'],
      order: { created_at: 'DESC' },
    });

    return courses;
  }
}


