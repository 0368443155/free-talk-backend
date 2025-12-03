import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GetTemplatesQuery } from '../queries/get-templates.query';
import { CourseTemplate } from '../../entities/course-template.entity';
import { TypeOrmTemplateRepository } from '../../infrastructure/repositories/template.repository';

interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@QueryHandler(GetTemplatesQuery)
export class GetTemplatesHandler implements IQueryHandler<GetTemplatesQuery> {
  constructor(
    private readonly templateRepository: TypeOrmTemplateRepository,
  ) {}

  async execute(query: GetTemplatesQuery): Promise<PaginatedResult<CourseTemplate>> {
    const { data, total } = await this.templateRepository.findAll(
      query.filters,
      query.pagination,
      query.sorting,
    );

    return {
      data,
      total,
      page: query.pagination.page,
      limit: query.pagination.limit,
      totalPages: Math.ceil(total / query.pagination.limit),
    };
  }
}

