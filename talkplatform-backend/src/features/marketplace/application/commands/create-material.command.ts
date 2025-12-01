import { MaterialType, MaterialLevel } from '../../entities/material.entity';

export class CreateMaterialCommand {
  constructor(
    public readonly teacherId: string,
    public readonly title: string,
    public readonly description: string,
    public readonly materialType: MaterialType,
    public readonly fileUrl: string,
    public readonly priceCredits: number,
    public readonly categoryId?: string,
    public readonly language?: string,
    public readonly level?: MaterialLevel,
    public readonly tags?: string[],
    public readonly previewUrl?: string,
    public readonly thumbnailUrl?: string,
    public readonly fileSize?: number,
    public readonly duration?: number,
    public readonly pageCount?: number,
  ) {}
}

