import { UpdateLessonDto } from '../../dto/lesson.dto';

export class UpdateLessonCommand {
  constructor(
    public readonly lessonId: string,
    public readonly teacherId: string,
    public readonly dto: UpdateLessonDto,
  ) {}
}


