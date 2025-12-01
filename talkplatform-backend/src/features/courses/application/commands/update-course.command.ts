import { UpdateCourseDto } from '../../dto/course.dto';

export class UpdateCourseCommand {
  constructor(
    public readonly courseId: string,
    public readonly teacherId: string,
    public readonly dto: UpdateCourseDto,
  ) {}
}


