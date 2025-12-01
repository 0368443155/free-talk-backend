export class DeleteSessionCommand {
  constructor(
    public readonly sessionId: string,
    public readonly teacherId: string,
  ) {}
}


