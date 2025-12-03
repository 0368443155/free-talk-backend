import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException } from '@nestjs/common';
import { GetTemplateByIdQuery } from '../queries/get-template-by-id.query';
import { CourseTemplate } from '../../entities/course-template.entity';

@QueryHandler(GetTemplateByIdQuery)
export class GetTemplateByIdHandler implements IQueryHandler<GetTemplateByIdQuery> {
  constructor(
    @InjectRepository(CourseTemplate)
    private readonly templateRepository: Repository<CourseTemplate>,
  ) {}

  async execute(query: GetTemplateByIdQuery): Promise<CourseTemplate> {
    const template = await this.templateRepository.findOne({
      where: { id: query.templateId },
      relations: ['creator', 'ratings', 'ratings.user'],
    });

    if (!template) {
      throw new NotFoundException('Template not found');
    }

    return template;
  }
}

