import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateTemplateCommand } from '../commands/create-template.command';
import { CourseTemplate } from '../../entities/course-template.entity';
import { Logger } from '@nestjs/common';

@CommandHandler(CreateTemplateCommand)
export class CreateTemplateHandler implements ICommandHandler<CreateTemplateCommand> {
  private readonly logger = new Logger(CreateTemplateHandler.name);

  constructor(
    @InjectRepository(CourseTemplate)
    private readonly templateRepository: Repository<CourseTemplate>,
  ) {}

  async execute(command: CreateTemplateCommand): Promise<CourseTemplate> {
    // Calculate metadata
    const totalSessions = command.sessionStructure.length;
    const totalDurationHours = Math.round(
      command.sessionStructure.reduce(
        (sum, session) => sum + session.durationMinutes / 60,
        0,
      ),
    );

    // Create template
    const template = this.templateRepository.create({
      name: command.name,
      description: command.description,
      createdBy: command.userId,
      isPublic: command.isPublic || false,
      category: command.category,
      level: command.level,
      language: command.language,
      totalSessions,
      sessionsPerWeek: command.sessionsPerWeek,
      totalDurationHours,
      sessionStructure: command.sessionStructure,
      suggestedPriceFull: command.suggestedPriceFull,
      suggestedPriceSession: command.suggestedPriceSession,
      tags: command.tags || [],
      usageCount: 0,
      totalRatings: 0,
    });

    const savedTemplate = await this.templateRepository.save(template);
    this.logger.log(`Template created: ${savedTemplate.id} by user ${command.userId}`);

    return savedTemplate;
  }
}

