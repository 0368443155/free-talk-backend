import { CreateLessonDto } from '../../dto/lesson.dto';

export class AddLessonCommand {
  constructor(
    public readonly sessionId: string,
    public readonly teacherId: string,
    public readonly dto: CreateLessonDto,
  ) {}
}

