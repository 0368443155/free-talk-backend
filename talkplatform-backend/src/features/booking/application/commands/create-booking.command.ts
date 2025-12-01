export class CreateBookingCommand {
  constructor(
    public readonly slotId: string,
    public readonly studentId: string,
    public readonly studentNotes?: string,
  ) {}
}

