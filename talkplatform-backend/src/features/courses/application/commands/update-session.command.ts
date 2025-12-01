import { UpdateSessionDto } from '../../dto/session.dto';

export class UpdateSessionCommand {
  constructor(
    public readonly sessionId: string,
    public readonly teacherId: string,
    public readonly dto: UpdateSessionDto,
  ) {}
}


