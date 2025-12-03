export class DeleteTemplateCommand {
  constructor(
    public readonly templateId: string,
    public readonly userId: string,
  ) {}
}

