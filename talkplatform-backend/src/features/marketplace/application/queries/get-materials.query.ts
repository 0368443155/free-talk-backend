import { MaterialType, MaterialLevel } from '../../entities/material.entity';

export class GetMaterialsQuery {
  constructor(
    public readonly filters?: {
      teacherId?: string;
      categoryId?: string;
      materialType?: MaterialType;
      level?: MaterialLevel;
      language?: string;
      isPublished?: boolean;
      minPrice?: number;
      maxPrice?: number;
      search?: string;
    },
    public readonly pagination?: {
      page?: number;
      limit?: number;
    },
  ) {}
}

