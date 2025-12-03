import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CourseTemplate } from '../../entities/course-template.entity';
import { TemplateUsage } from '../../entities/template-usage.entity';
import {
  ITemplateRepository,
  TemplateFilters,
  PaginationOptions,
  SortingOptions,
  PaginatedResult,
} from '../../domain/repositories/template.repository.interface';

@Injectable()
export class TypeOrmTemplateRepository implements ITemplateRepository {
  constructor(
    @InjectRepository(CourseTemplate)
    private readonly templateRepository: Repository<CourseTemplate>,
    @InjectRepository(TemplateUsage)
    private readonly usageRepository: Repository<TemplateUsage>,
  ) {}

  async save(template: CourseTemplate): Promise<CourseTemplate> {
    return this.templateRepository.save(template);
  }

  async findById(id: string): Promise<CourseTemplate | null> {
    return this.templateRepository.findOne({
      where: { id },
      relations: ['creator'],
    });
  }

  async findAll(
    filters: TemplateFilters,
    pagination: PaginationOptions,
    sorting: SortingOptions,
  ): Promise<PaginatedResult<CourseTemplate>> {
    const query = this.templateRepository.createQueryBuilder('template');

    // Apply filters
    if (filters.category) {
      query.andWhere('template.category = :category', { category: filters.category });
    }
    if (filters.level) {
      query.andWhere('template.level = :level', { level: filters.level });
    }
    if (filters.language) {
      query.andWhere('template.language = :language', { language: filters.language });
    }
    if (filters.isPublic !== undefined) {
      query.andWhere('template.isPublic = :isPublic', { isPublic: filters.isPublic });
    }
    if (filters.isFeatured !== undefined) {
      query.andWhere('template.isFeatured = :isFeatured', { isFeatured: filters.isFeatured });
    }
    if (filters.createdBy) {
      query.andWhere('template.createdBy = :createdBy', { createdBy: filters.createdBy });
    }
    if (filters.tags && filters.tags.length > 0) {
      // MySQL JSON_CONTAINS for array search
      for (const tag of filters.tags) {
        query.andWhere('JSON_CONTAINS(template.tags, :tag)', {
          tag: JSON.stringify(tag),
        });
      }
    }

    // Sorting
    const sortField = sorting.field === 'createdAt' ? 'template.created_at' : `template.${sorting.field}`;
    query.orderBy(sortField, sorting.order);

    // Pagination
    const skip = (pagination.page - 1) * pagination.limit;
    query.skip(skip).take(pagination.limit);

    // Execute
    const [data, total] = await query.getManyAndCount();

    return { data, total };
  }

  async delete(id: string): Promise<void> {
    await this.templateRepository.delete(id);
  }

  async incrementUsageCount(id: string): Promise<void> {
    await this.templateRepository.increment({ id }, 'usageCount', 1);
  }

  async trackUsage(templateId: string, courseId: string, userId: string): Promise<void> {
    const usage = this.usageRepository.create({
      templateId,
      courseId,
      usedBy: userId,
    });
    await this.usageRepository.save(usage);
  }

  async updateRating(id: string, newRating: number, totalRatings: number): Promise<void> {
    await this.templateRepository.update(id, {
      rating: Math.round(newRating * 100) / 100,
      totalRatings,
    });
  }
}

