export class PurchaseMaterialCommand {
  constructor(
    public readonly materialId: string,
    public readonly userId: string,
  ) {}
}

