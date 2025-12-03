export class RateTemplateCommand {
  constructor(
    public readonly userId: string,
    public readonly templateId: string,
    public readonly rating: number,
    public readonly review?: string,
  ) {}
}

