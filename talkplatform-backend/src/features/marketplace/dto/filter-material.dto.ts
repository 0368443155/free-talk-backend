import { IsEnum, IsOptional, IsString, Min, IsInt } from 'class-validator';
import { Type } from 'class-transformer';
import { MaterialType, MaterialLevel } from '../entities/material.entity';

export class FilterMaterialDto {
    @IsOptional()
    @IsString()
    search?: string;

    @IsOptional()
    @IsEnum(MaterialType)
    type?: MaterialType;

    @IsOptional()
    @IsEnum(MaterialLevel)
    level?: MaterialLevel;

    @IsOptional()
    @IsString()
    category_id?: string;

    @IsOptional()
    @IsInt()
    @Min(0)
    @Type(() => Number)
    min_price?: number;

    @IsOptional()
    @IsInt()
    @Min(0)
    @Type(() => Number)
    max_price?: number;

    @IsOptional()
    @IsString()
    language?: string;

    @IsOptional()
    @IsString()
    sort?: 'newest' | 'popular' | 'price_asc' | 'price_desc' | 'rating';

    @IsOptional()
    @IsInt()
    @Min(1)
    @Type(() => Number)
    page?: number = 1;

    @IsOptional()
    @IsInt()
    @Min(1)
    @Type(() => Number)
    limit?: number = 10;
}
