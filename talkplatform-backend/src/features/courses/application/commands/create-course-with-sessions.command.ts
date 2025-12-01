import { CreateCourseWithSessionsDto } from '../../dto/course.dto';

export class CreateCourseWithSessionsCommand {
  constructor(
    public readonly teacherId: string,
    public readonly dto: CreateCourseWithSessionsDto,
  ) {}
}

