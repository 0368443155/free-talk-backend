import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { DeleteTemplateCommand } from '../commands/delete-template.command';
import { CourseTemplate } from '../../entities/course-template.entity';
import { Logger } from '@nestjs/common';

@CommandHandler(DeleteTemplateCommand)
export class DeleteTemplateHandler implements ICommandHandler<DeleteTemplateCommand> {
  private readonly logger = new Logger(DeleteTemplateHandler.name);

  constructor(
    @InjectRepository(CourseTemplate)
    private readonly templateRepository: Repository<CourseTemplate>,
  ) {}

  async execute(command: DeleteTemplateCommand): Promise<void> {
    // 1. Find template
    const template = await this.templateRepository.findOne({
      where: { id: command.templateId },
    });

    if (!template) {
      throw new NotFoundException('Template not found');
    }

    // 2. Check ownership
    if (template.createdBy !== command.userId) {
      throw new ForbiddenException('You can only delete your own templates');
    }

    // 3. Delete template (cascade will handle related records)
    await this.templateRepository.remove(template);

    this.logger.log(`Template deleted: ${command.templateId} by user ${command.userId}`);
  }
}

