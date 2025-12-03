import { CourseTemplate } from '../../entities/course-template.entity';

export interface TemplateFilters {
  category?: string;
  level?: string;
  language?: string;
  isPublic?: boolean;
  isFeatured?: boolean;
  createdBy?: string;
  tags?: string[];
}

export interface PaginationOptions {
  page: number;
  limit: number;
}

export interface SortingOptions {
  field: 'usageCount' | 'rating' | 'createdAt';
  order: 'ASC' | 'DESC';
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
}

export interface ITemplateRepository {
  save(template: CourseTemplate): Promise<CourseTemplate>;
  findById(id: string): Promise<CourseTemplate | null>;
  findAll(
    filters: TemplateFilters,
    pagination: PaginationOptions,
    sorting: SortingOptions,
  ): Promise<PaginatedResult<CourseTemplate>>;
  delete(id: string): Promise<void>;
  incrementUsageCount(id: string): Promise<void>;
  trackUsage(templateId: string, courseId: string, userId: string): Promise<void>;
  updateRating(id: string, newRating: number, totalRatings: number): Promise<void>;
}

