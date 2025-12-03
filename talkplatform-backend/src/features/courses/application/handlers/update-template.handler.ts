import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { UpdateTemplateCommand } from '../commands/update-template.command';
import { CourseTemplate } from '../../entities/course-template.entity';
import { Logger } from '@nestjs/common';

@CommandHandler(UpdateTemplateCommand)
export class UpdateTemplateHandler implements ICommandHandler<UpdateTemplateCommand> {
  private readonly logger = new Logger(UpdateTemplateHandler.name);

  constructor(
    @InjectRepository(CourseTemplate)
    private readonly templateRepository: Repository<CourseTemplate>,
  ) {}

  async execute(command: UpdateTemplateCommand): Promise<CourseTemplate> {
    // 1. Find template
    const template = await this.templateRepository.findOne({
      where: { id: command.templateId },
    });

    if (!template) {
      throw new NotFoundException('Template not found');
    }

    // 2. Check ownership
    if (template.createdBy !== command.userId) {
      throw new ForbiddenException('You can only update your own templates');
    }

    // 3. Calculate metadata if sessionStructure changed
    let totalSessions = template.totalSessions;
    let totalDurationHours = template.totalDurationHours;

    if (command.updates.sessionStructure) {
      totalSessions = command.updates.sessionStructure.length;
      totalDurationHours = Math.round(
        command.updates.sessionStructure.reduce(
          (sum, session) => sum + session.durationMinutes / 60,
          0,
        ),
      );
    }

    // 4. Update template
    const updates: Partial<CourseTemplate> = {
      ...command.updates,
      totalSessions,
      totalDurationHours,
    };

    await this.templateRepository.update(command.templateId, updates);

    // 5. Return updated template
    const updatedTemplate = await this.templateRepository.findOne({
      where: { id: command.templateId },
    });

    this.logger.log(`Template updated: ${command.templateId} by user ${command.userId}`);

    return updatedTemplate!;
  }
}

