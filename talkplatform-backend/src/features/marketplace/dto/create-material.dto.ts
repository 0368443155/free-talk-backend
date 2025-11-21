import {
    IsString,
    IsNotEmpty,
    IsEnum,
    IsInt,
    IsOptional,
    IsArray,
    Min,
    MaxLength,
    IsUrl,
} from 'class-validator';
import { MaterialType, MaterialLevel } from '../entities/material.entity';

export class CreateMaterialDto {
    @IsString()
    @IsNotEmpty()
    @MaxLength(255)
    title: string;

    @IsString()
    @IsNotEmpty()
    description: string;

    @IsEnum(MaterialType)
    material_type: MaterialType;

    @IsUrl()
    @IsNotEmpty()
    file_url: string;

    @IsOptional()
    @IsInt()
    @Min(0)
    file_size?: number;

    @IsOptional()
    @IsUrl()
    preview_url?: string;

    @IsOptional()
    @IsUrl()
    thumbnail_url?: string;

    @IsInt()
    @Min(0)
    price_credits: number;

    @IsOptional()
    @IsInt()
    @Min(0)
    original_price_credits?: number;

    @IsOptional()
    @IsString()
    category_id?: string;

    @IsOptional()
    @IsString()
    language?: string;

    @IsOptional()
    @IsEnum(MaterialLevel)
    level?: MaterialLevel;

    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    tags?: string[];

    @IsOptional()
    @IsInt()
    @Min(0)
    duration?: number;

    @IsOptional()
    @IsInt()
    @Min(0)
    page_count?: number;
}
