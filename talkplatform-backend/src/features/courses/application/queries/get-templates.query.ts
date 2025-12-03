import { TemplateFilters, PaginationOptions, SortingOptions } from '../../domain/repositories/template.repository.interface';

export class GetTemplatesQuery {
  constructor(
    public readonly filters: TemplateFilters,
    public readonly pagination: PaginationOptions,
    public readonly sorting: SortingOptions,
  ) {}
}

