import { Type } from 'class-transformer';
import {
    IsString,
    IsOptional,
    IsNumber,
    IsArray,
    ValidateNested,
    IsEnum,
    IsBoolean,
    Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MaterialType } from '../entities/session-material.entity';

export class CreateSessionMaterialDto {
    @ApiProperty({ enum: MaterialType, description: 'Type of material' })
    @IsEnum(MaterialType)
    type: MaterialType;

    @ApiProperty({ description: 'Title of the material' })
    @IsString()
    title: string;

    @ApiPropertyOptional({ description: 'Description of the material' })
    @IsOptional()
    @IsString()
    description?: string;

    @ApiPropertyOptional({ description: 'URL to the file' })
    @IsOptional()
    @IsString()
    file_url?: string;

    @ApiPropertyOptional({ description: 'Original file name' })
    @IsOptional()
    @IsString()
    file_name?: string;

    @ApiPropertyOptional({ description: 'File size in bytes' })
    @IsOptional()
    @IsNumber()
    file_size?: number;

    @ApiPropertyOptional({ description: 'MIME type of the file' })
    @IsOptional()
    @IsString()
    file_type?: string;

    @ApiPropertyOptional({ description: 'Display order', default: 0 })
    @IsOptional()
    @IsNumber()
    @Min(0)
    display_order?: number;

    @ApiPropertyOptional({ description: 'Is this material required?', default: false })
    @IsOptional()
    @IsBoolean()
    is_required?: boolean;
}

export class CreateSessionWithMaterialsDto {
    @ApiProperty({ description: 'Session number', minimum: 1 })
    @IsNumber()
    @Min(1)
    session_number: number;

    @ApiProperty({ description: 'Session title' })
    @IsString()
    title: string;

    @ApiPropertyOptional({ description: 'Session description' })
    @IsOptional()
    @IsString()
    description?: string;

    @ApiProperty({ description: 'Scheduled date (YYYY-MM-DD)' })
    @IsString()
    scheduled_date: string;

    @ApiProperty({ description: 'Start time (HH:MM)' })
    @IsString()
    start_time: string;

    @ApiProperty({ description: 'End time (HH:MM)' })
    @IsString()
    end_time: string;

    @ApiPropertyOptional({ type: [CreateSessionMaterialDto], description: 'Materials for this session' })
    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => CreateSessionMaterialDto)
    materials?: CreateSessionMaterialDto[];
}

