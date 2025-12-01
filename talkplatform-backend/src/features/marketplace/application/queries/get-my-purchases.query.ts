export class GetMyPurchasesQuery {
  constructor(
    public readonly userId: string,
    public readonly pagination?: {
      page?: number;
      limit?: number;
    },
  ) {}
}

