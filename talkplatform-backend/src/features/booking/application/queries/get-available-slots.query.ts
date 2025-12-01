export class GetAvailableSlotsQuery {
  constructor(
    public readonly teacherId: string,
    public readonly fromDate?: Date,
    public readonly toDate?: Date,
  ) {}
}

