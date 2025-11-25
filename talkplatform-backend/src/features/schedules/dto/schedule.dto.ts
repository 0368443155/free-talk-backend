import { IsString, IsNotEmpty, IsNumber, IsDate, IsOptional, Min, Max, IsEnum, IsInt, MinDate } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ScheduleLevel } from '../entities/schedule.entity';

export class CreateScheduleDto {
    @ApiProperty({ example: 'English Conversation Practice', description: 'Schedule title' })
    @IsString()
    @IsNotEmpty()
    title: string;

    @ApiPropertyOptional({ example: 'Practice daily conversation in English', description: 'Schedule description' })
    @IsString()
    @IsOptional()
    description?: string;

    @ApiProperty({ example: '2025-12-01T10:00:00Z', description: 'Start time (ISO 8601)' })
    @Type(() => Date)
    @IsDate()
    @MinDate(new Date(), { message: 'Start time must be in the future' })
    start_time: Date;

    @ApiProperty({ example: '2025-12-01T11:30:00Z', description: 'End time (ISO 8601)' })
    @Type(() => Date)
    @IsDate()
    end_time: Date;

    @ApiProperty({ example: 10.00, description: 'Price in credits', minimum: 0 })
    @IsNumber()
    @Min(0, { message: 'Price must be at least 0' })
    price: number;

    @ApiPropertyOptional({ example: 10, description: 'Maximum number of students', minimum: 1, maximum: 50 })
    @IsInt()
    @Min(1)
    @Max(50)
    @IsOptional()
    max_students?: number;

    @ApiPropertyOptional({ example: 'English', description: 'Teaching language' })
    @IsString()
    @IsOptional()
    language?: string;

    @ApiPropertyOptional({ enum: ScheduleLevel, example: ScheduleLevel.BEGINNER, description: 'Difficulty level' })
    @IsEnum(ScheduleLevel)
    @IsOptional()
    level?: ScheduleLevel;
}

export class UpdateScheduleDto {
    @ApiPropertyOptional({ example: 'English Conversation Practice', description: 'Schedule title' })
    @IsString()
    @IsOptional()
    title?: string;

    @ApiPropertyOptional({ example: 'Practice daily conversation in English', description: 'Schedule description' })
    @IsString()
    @IsOptional()
    description?: string;

    @ApiPropertyOptional({ example: '2025-12-01T10:00:00Z', description: 'Start time (ISO 8601)' })
    @Type(() => Date)
    @IsDate()
    @IsOptional()
    start_time?: Date;

    @ApiPropertyOptional({ example: '2025-12-01T11:30:00Z', description: 'End time (ISO 8601)' })
    @Type(() => Date)
    @IsDate()
    @IsOptional()
    end_time?: Date;

    @ApiPropertyOptional({ example: 10.00, description: 'Price in credits', minimum: 0 })
    @IsNumber()
    @Min(0)
    @IsOptional()
    price?: number;

    @ApiPropertyOptional({ example: 10, description: 'Maximum number of students', minimum: 1, maximum: 50 })
    @IsInt()
    @Min(1)
    @Max(50)
    @IsOptional()
    max_students?: number;

    @ApiPropertyOptional({ example: 'English', description: 'Teaching language' })
    @IsString()
    @IsOptional()
    language?: string;

    @ApiPropertyOptional({ enum: ScheduleLevel, example: ScheduleLevel.BEGINNER, description: 'Difficulty level' })
    @IsEnum(ScheduleLevel)
    @IsOptional()
    level?: ScheduleLevel;
}

export class GetSchedulesQueryDto {
    @ApiPropertyOptional({ example: 'teacher-uuid', description: 'Filter by teacher ID' })
    @IsString()
    @IsOptional()
    teacher_id?: string;

    @ApiPropertyOptional({ example: 'open', description: 'Filter by status' })
    @IsString()
    @IsOptional()
    status?: string;

    @ApiPropertyOptional({ example: '2025-12-01', description: 'Filter by date (YYYY-MM-DD)' })
    @IsString()
    @IsOptional()
    date?: string;

    @ApiPropertyOptional({ example: 'English', description: 'Filter by language' })
    @IsString()
    @IsOptional()
    language?: string;

    @ApiPropertyOptional({ example: 'beginner', description: 'Filter by level' })
    @IsString()
    @IsOptional()
    level?: string;

    @ApiPropertyOptional({ example: 1, description: 'Page number', minimum: 1 })
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @IsOptional()
    page?: number;

    @ApiPropertyOptional({ example: 20, description: 'Items per page', minimum: 1, maximum: 100 })
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(100)
    @IsOptional()
    limit?: number;
}
