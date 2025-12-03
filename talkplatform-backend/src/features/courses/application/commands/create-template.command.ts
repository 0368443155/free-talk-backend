import { SessionStructure } from '../../entities/course-template.entity';

export class CreateTemplateCommand {
  constructor(
    public readonly userId: string,
    public readonly name: string,
    public readonly description: string | undefined,
    public readonly isPublic: boolean,
    public readonly category: string | undefined,
    public readonly level: string | undefined,
    public readonly language: string | undefined,
    public readonly sessionStructure: SessionStructure[],
    public readonly sessionsPerWeek: number | undefined,
    public readonly suggestedPriceFull: number | undefined,
    public readonly suggestedPriceSession: number | undefined,
    public readonly tags: string[] | undefined,
  ) {}
}

