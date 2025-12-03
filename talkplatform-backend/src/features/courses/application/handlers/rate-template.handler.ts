import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { RateTemplateCommand } from '../commands/rate-template.command';
import { CourseTemplate } from '../../entities/course-template.entity';
import { TemplateRating } from '../../entities/template-rating.entity';
import { Logger } from '@nestjs/common';

@CommandHandler(RateTemplateCommand)
export class RateTemplateHandler implements ICommandHandler<RateTemplateCommand> {
  private readonly logger = new Logger(RateTemplateHandler.name);

  constructor(
    @InjectRepository(CourseTemplate)
    private readonly templateRepository: Repository<CourseTemplate>,
    @InjectRepository(TemplateRating)
    private readonly ratingRepository: Repository<TemplateRating>,
  ) {}

  async execute(command: RateTemplateCommand): Promise<TemplateRating> {
    // 1. Validate rating
    if (command.rating < 1 || command.rating > 5) {
      throw new BadRequestException('Rating must be between 1 and 5');
    }

    // 2. Find template
    const template = await this.templateRepository.findOne({
      where: { id: command.templateId },
    });

    if (!template) {
      throw new NotFoundException('Template not found');
    }

    // 3. Check if user already rated this template
    let existingRating = await this.ratingRepository.findOne({
      where: {
        templateId: command.templateId,
        userId: command.userId,
      },
    });

    if (existingRating) {
      // Update existing rating
      existingRating.rating = command.rating;
      if (command.review !== undefined) {
        existingRating.review = command.review;
      }
      existingRating = await this.ratingRepository.save(existingRating);
    } else {
      // Create new rating
      existingRating = this.ratingRepository.create({
        templateId: command.templateId,
        userId: command.userId,
        rating: command.rating,
        review: command.review,
      });
      existingRating = await this.ratingRepository.save(existingRating);
    }

    // 4. Update template rating average
    const allRatings = await this.ratingRepository.find({
      where: { templateId: command.templateId },
    });

    const averageRating =
      allRatings.reduce((sum, r) => sum + r.rating, 0) / allRatings.length;

    await this.templateRepository.update(command.templateId, {
      rating: Math.round(averageRating * 100) / 100,
      totalRatings: allRatings.length,
    });

    this.logger.log(
      `Template ${command.templateId} rated ${command.rating} by user ${command.userId}`,
    );

    return existingRating;
  }
}

