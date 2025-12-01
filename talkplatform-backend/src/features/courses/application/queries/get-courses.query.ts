import { CourseStatus, CourseCategory, CourseLevel } from '../../entities/course.entity';

export class GetCoursesQuery {
  constructor(
    public readonly filters?: {
      teacherId?: string;
      status?: CourseStatus;
      category?: CourseCategory;
      level?: CourseLevel;
      language?: string;
      isPublished?: boolean;
      search?: string;
    },
    public readonly pagination?: {
      page?: number;
      limit?: number;
    },
  ) {}
}

