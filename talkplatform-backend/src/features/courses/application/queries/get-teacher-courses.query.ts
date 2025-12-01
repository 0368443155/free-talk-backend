import { CourseStatus } from '../../entities/course.entity';

export class GetTeacherCoursesQuery {
  constructor(
    public readonly teacherId: string,
    public readonly status?: CourseStatus,
  ) {}
}


