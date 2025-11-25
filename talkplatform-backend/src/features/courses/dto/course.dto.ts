import {
    IsString,
    IsNotEmpty,
    IsNumber,
    IsOptional,
    Min,
    Max,
    IsEnum,
    IsInt,
    ValidateIf,
    IsPositive,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CourseLevel, PriceType } from '../entities/course.entity';

export class CreateCourseDto {
    @ApiProperty({
        example: 'English Conversation Mastery',
        description: 'Course title'
    })
    @IsString()
    @IsNotEmpty()
    title: string;

    @ApiPropertyOptional({
        example: 'Master English conversation through practical sessions',
        description: 'Course description'
    })
    @IsString()
    @IsOptional()
    description?: string;

    @ApiProperty({
        example: 20,
        description: 'Total duration in hours',
        minimum: 1
    })
    @IsInt()
    @Min(1)
    duration_hours: number;

    @ApiProperty({
        example: 10,
        description: 'Total number of sessions',
        minimum: 1
    })
    @IsInt()
    @Min(1)
    total_sessions: number;

    @ApiProperty({
        enum: PriceType,
        example: PriceType.PER_SESSION,
        description: 'Pricing model: per_session or full_course'
    })
    @IsEnum(PriceType)
    price_type: PriceType;

    @ApiPropertyOptional({
        example: 10.00,
        description: 'Price per session (required if price_type is per_session)',
        minimum: 1.00
    })
    @ValidateIf(o => o.price_type === PriceType.PER_SESSION)
    @IsNumber()
    @Min(1.00, { message: 'Price per session must be at least $1.00' })
    price_per_session?: number;

    @ApiPropertyOptional({
        example: 80.00,
        description: 'Full course price (required if price_type is full_course)',
        minimum: 1.00
    })
    @ValidateIf(o => o.price_type === PriceType.FULL_COURSE)
    @IsNumber()
    @Min(1.00, { message: 'Full course price must be at least $1.00' })
    price_full_course?: number;

    @ApiPropertyOptional({
        example: 'English',
        description: 'Teaching language'
    })
    @IsString()
    @IsOptional()
    language?: string;

    @ApiPropertyOptional({
        enum: CourseLevel,
        example: CourseLevel.BEGINNER,
        description: 'Difficulty level'
    })
    @IsEnum(CourseLevel)
    @IsOptional()
    level?: CourseLevel;

    @ApiPropertyOptional({
        example: 'Language Learning',
        description: 'Course category'
    })
    @IsString()
    @IsOptional()
    category?: string;

    @ApiPropertyOptional({
        example: 20,
        description: 'Maximum number of students',
        minimum: 1,
        maximum: 100
    })
    @IsInt()
    @Min(1)
    @Max(100)
    @IsOptional()
    max_students?: number;
}

export class UpdateCourseDto {
    @ApiPropertyOptional({ example: 'English Conversation Mastery' })
    @IsString()
    @IsOptional()
    title?: string;

    @ApiPropertyOptional({ example: 'Master English conversation...' })
    @IsString()
    @IsOptional()
    description?: string;

    @ApiPropertyOptional({ example: 20, minimum: 1 })
    @IsInt()
    @Min(1)
    @IsOptional()
    duration_hours?: number;

    @ApiPropertyOptional({ example: 10, minimum: 1 })
    @IsInt()
    @Min(1)
    @IsOptional()
    total_sessions?: number;

    @ApiPropertyOptional({ enum: PriceType })
    @IsEnum(PriceType)
    @IsOptional()
    price_type?: PriceType;

    @ApiPropertyOptional({ example: 10.00, minimum: 1.00 })
    @IsNumber()
    @Min(1.00)
    @IsOptional()
    price_per_session?: number;

    @ApiPropertyOptional({ example: 80.00, minimum: 1.00 })
    @IsNumber()
    @Min(1.00)
    @IsOptional()
    price_full_course?: number;

    @ApiPropertyOptional({ example: 'English' })
    @IsString()
    @IsOptional()
    language?: string;

    @ApiPropertyOptional({ enum: CourseLevel })
    @IsEnum(CourseLevel)
    @IsOptional()
    level?: CourseLevel;

    @ApiPropertyOptional({ example: 'Language Learning' })
    @IsString()
    @IsOptional()
    category?: string;

    @ApiPropertyOptional({ example: 20, minimum: 1, maximum: 100 })
    @IsInt()
    @Min(1)
    @Max(100)
    @IsOptional()
    max_students?: number;
}

export class GetCoursesQueryDto {
    @ApiPropertyOptional({ example: 'teacher-uuid', description: 'Filter by teacher ID' })
    @IsString()
    @IsOptional()
    teacher_id?: string;

    @ApiPropertyOptional({ example: 'upcoming', description: 'Filter by status' })
    @IsString()
    @IsOptional()
    status?: string;

    @ApiPropertyOptional({ example: 'English', description: 'Filter by language' })
    @IsString()
    @IsOptional()
    language?: string;

    @ApiPropertyOptional({ example: 'beginner', description: 'Filter by level' })
    @IsString()
    @IsOptional()
    level?: string;

    @ApiPropertyOptional({ example: 'Language Learning', description: 'Filter by category' })
    @IsString()
    @IsOptional()
    category?: string;

    @ApiPropertyOptional({ example: 1, description: 'Page number', minimum: 1 })
    @IsInt()
    @Min(1)
    @IsOptional()
    page?: number;

    @ApiPropertyOptional({ example: 20, description: 'Items per page', minimum: 1, maximum: 100 })
    @IsInt()
    @Min(1)
    @Max(100)
    @IsOptional()
    limit?: number;
}
