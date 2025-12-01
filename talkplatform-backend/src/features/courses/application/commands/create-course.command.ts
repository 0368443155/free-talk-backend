import { PriceType, CourseCategory, CourseLevel } from '../../entities/course.entity';

export class CreateCourseCommand {
  constructor(
    public readonly teacherId: string,
    public readonly title: string,
    public readonly description?: string,
    public readonly durationHours?: number,
    public readonly priceType?: PriceType,
    public readonly pricePerSession?: number,
    public readonly priceFullCourse?: number,
    public readonly language?: string,
    public readonly level?: CourseLevel,
    public readonly category?: CourseCategory,
    public readonly tags?: string[],
    public readonly maxStudents?: number,
  ) {}
}

