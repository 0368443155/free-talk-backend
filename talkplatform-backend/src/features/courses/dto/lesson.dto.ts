import {
    IsString,
    IsNotEmpty,
    IsInt,
    IsOptional,
    Min,
    IsDateString,
    Matches,
    IsArray,
    ValidateNested,
    IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CreateLessonMaterialDto } from './lesson-material.dto';

export class CreateLessonDto {
    @ApiProperty({ description: 'Lesson number within session', minimum: 1 })
    @IsInt()
    @Min(1)
    lesson_number: number;

    @ApiProperty({ description: 'Lesson title' })
    @IsString()
    @IsNotEmpty()
    title: string;

    @ApiPropertyOptional({ description: 'Lesson description' })
    @IsOptional()
    @IsString()
    description?: string;

    @ApiProperty({ description: 'Scheduled date (YYYY-MM-DD)' })
    @IsDateString()
    scheduled_date: string;

    @ApiProperty({ description: 'Start time (HH:MM)' })
    @IsString()
    @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, {
        message: 'Start time must be in HH:MM format'
    })
    start_time: string;

    @ApiProperty({ description: 'End time (HH:MM)' })
    @IsString()
    @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, {
        message: 'End time must be in HH:MM format'
    })
    end_time: string;

    @ApiPropertyOptional({ type: [CreateLessonMaterialDto], description: 'Materials for this lesson' })
    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => CreateLessonMaterialDto)
    materials?: CreateLessonMaterialDto[];

    @ApiPropertyOptional({ description: 'Is this a preview lesson?' })
    @IsOptional()
    @IsBoolean()
    is_preview?: boolean;

    @ApiPropertyOptional({ description: 'Is this a free lesson?' })
    @IsOptional()
    @IsBoolean()
    is_free?: boolean;
}

export class UpdateLessonDto {
    @ApiPropertyOptional({ description: 'Lesson title' })
    @IsString()
    @IsOptional()
    title?: string;

    @ApiPropertyOptional({ description: 'Lesson description' })
    @IsOptional()
    @IsString()
    description?: string;

    @ApiPropertyOptional({ description: 'Scheduled date (YYYY-MM-DD)' })
    @IsDateString()
    @IsOptional()
    scheduled_date?: string;

    @ApiPropertyOptional({ description: 'Start time (HH:MM)' })
    @IsString()
    @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
    @IsOptional()
    start_time?: string;

    @ApiPropertyOptional({ description: 'End time (HH:MM)' })
    @IsString()
    @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
    @IsOptional()
    end_time?: string;

    @ApiPropertyOptional({ type: [CreateLessonMaterialDto], description: 'Materials for this lesson' })
    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => CreateLessonMaterialDto)
    materials?: CreateLessonMaterialDto[];

    @ApiPropertyOptional()
    @IsOptional()
    @IsBoolean()
    is_preview?: boolean;

    @ApiPropertyOptional()
    @IsOptional()
    @IsBoolean()
    is_free?: boolean;
}
