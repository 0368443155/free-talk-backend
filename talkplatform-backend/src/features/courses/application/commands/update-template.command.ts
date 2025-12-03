import { SessionStructure } from '../../entities/course-template.entity';

export class UpdateTemplateCommand {
  constructor(
    public readonly templateId: string,
    public readonly userId: string,
    public readonly updates: {
      name?: string;
      description?: string;
      isPublic?: boolean;
      category?: string;
      level?: string;
      language?: string;
      sessionsPerWeek?: number;
      sessionStructure?: SessionStructure[];
      suggestedPriceFull?: number;
      suggestedPriceSession?: number;
      tags?: string[];
    },
  ) {}
}

