import { CreateSessionDto } from '../../dto/session.dto';

export class AddSessionCommand {
  constructor(
    public readonly courseId: string,
    public readonly teacherId: string,
    public readonly dto: CreateSessionDto,
  ) {}
}


