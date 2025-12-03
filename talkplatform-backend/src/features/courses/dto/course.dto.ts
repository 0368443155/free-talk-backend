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
    IsArray,
    ValidateNested,
    MaxLength,
    IsUrl,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CourseLevel, PriceType, CourseCategory } from '../entities/course.entity';
import { CreateSessionWithMaterialsDto } from './session-material.dto';
import { CreateLessonMaterialDto } from './lesson-material.dto';

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

    @ApiPropertyOptional({
        example: 0,
        description: 'Total number of sessions (auto-calculated when sessions are added, default: 0)',
        minimum: 0
    })
    @IsInt()
    @Min(0)
    @IsOptional()
    total_sessions?: number;

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
        enum: CourseCategory,
        example: CourseCategory.ENGLISH,
        description: 'Course category'
    })
    @IsEnum(CourseCategory)
    @IsOptional()
    category?: CourseCategory;

    @ApiPropertyOptional({
        example: ['conversation', 'grammar', 'business-english'],
        description: 'Course tags (max 20 characters each)',
        type: [String],
    })
    @IsArray()
    @IsOptional()
    @IsString({ each: true })
    @MaxLength(20, { each: true, message: 'Each tag must be at most 20 characters' })
    tags?: string[];

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

    @ApiPropertyOptional({
        enum: CourseCategory,
        example: CourseCategory.ENGLISH,
        description: 'Course category'
    })
    @IsEnum(CourseCategory)
    @IsOptional()
    category?: CourseCategory;

    @ApiPropertyOptional({
        example: ['conversation', 'grammar', 'business-english'],
        description: 'Course tags (max 20 characters each)',
        type: [String],
    })
    @IsArray()
    @IsOptional()
    @IsString({ each: true })
    @MaxLength(20, { each: true, message: 'Each tag must be at most 20 characters' })
    tags?: string[];

    @ApiPropertyOptional({ enum: CourseLevel })
    @IsEnum(CourseLevel)
    @IsOptional()
    level?: CourseLevel;

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

    @ApiPropertyOptional({ example: 'published', description: 'Filter by status' })
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

    @ApiPropertyOptional({ example: 'conversation', description: 'Search in title and description' })
    @IsString()
    @IsOptional()
    search?: string;

    @ApiPropertyOptional({ example: 0, description: 'Minimum price filter' })
    @IsNumber()
    @IsOptional()
    minPrice?: number;

    @ApiPropertyOptional({ example: 200, description: 'Maximum price filter' })
    @IsNumber()
    @IsOptional()
    maxPrice?: number;

    @ApiPropertyOptional({ example: 'created_at', description: 'Sort field (created_at, price_full_course, title, current_students)' })
    @IsString()
    @IsOptional()
    sortBy?: string;

    @ApiPropertyOptional({ example: 'DESC', description: 'Sort order (ASC or DESC)' })
    @IsString()
    @IsOptional()
    sortOrder?: string;

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

// Lesson DTOs (must be defined before CreateCourseWithSessionsDto)
export class CreateLessonDto {
    @ApiProperty({ description: 'Lesson number within session', minimum: 1 })
    @IsNumber()
    @Min(1)
    lesson_number: number;

    @ApiProperty({ description: 'Lesson title' })
    @IsString()
    title: string;

    @ApiPropertyOptional({ description: 'Lesson description' })
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

    @ApiPropertyOptional({ type: [CreateLessonMaterialDto], description: 'Materials for this lesson' })
    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => CreateLessonMaterialDto)
    materials?: CreateLessonMaterialDto[];
}

export class CreateSessionWithLessonsDto {
    @ApiProperty({ description: 'Session number', minimum: 1 })
    @IsNumber()
    @Min(1)
    session_number: number;

    @ApiProperty({ description: 'Session title (e.g., "Week 1", "Module 1")' })
    @IsString()
    title: string;

    @ApiPropertyOptional({ description: 'Session description' })
    @IsOptional()
    @IsString()
    description?: string;

    @ApiProperty({ type: [CreateLessonDto], description: 'Lessons in this session' })
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => CreateLessonDto)
    lessons: CreateLessonDto[];
}

export class CreateCourseWithSessionsDto {
    // Course info
    @ApiProperty({ example: 'English Conversation Mastery', description: 'Course title' })
    @IsString()
    @IsNotEmpty()
    title: string;

    @ApiPropertyOptional({ example: 'Master English conversation...', description: 'Course description' })
    @IsString()
    @IsOptional()
    description?: string;

    @ApiPropertyOptional({
        enum: CourseCategory,
        example: CourseCategory.ENGLISH,
        description: 'Course category'
    })
    @IsEnum(CourseCategory)
    @IsOptional()
    category?: CourseCategory;

    @ApiPropertyOptional({
        example: ['conversation', 'grammar', 'business-english'],
        description: 'Course tags (max 20 characters each)',
        type: [String],
    })
    @IsArray()
    @IsOptional()
    @IsString({ each: true })
    @MaxLength(20, { each: true, message: 'Each tag must be at most 20 characters' })
    tags?: string[];

    @ApiPropertyOptional({ enum: CourseLevel, description: 'Course level' })
    @IsEnum(CourseLevel)
    @IsOptional()
    level?: CourseLevel;

    @ApiPropertyOptional({ example: 'English', description: 'Teaching language' })
    @IsString()
    @IsOptional()
    language?: string;

    @ApiPropertyOptional({ example: 100, description: 'Full course price', minimum: 1 })
    @IsNumber()
    @Min(1)
    @IsOptional()
    price_full_course?: number;

    @ApiPropertyOptional({ example: 10, description: 'Price per session', minimum: 1 })
    @IsNumber()
    @Min(1)
    @IsOptional()
    price_per_session?: number;

    @ApiPropertyOptional({ example: 30, description: 'Maximum students', minimum: 1, maximum: 100, default: 30 })
    @IsInt()
    @Min(1)
    @Max(100)
    @IsOptional()
    max_students?: number;

    @ApiPropertyOptional({ example: 20, description: 'Total duration in hours', minimum: 1 })
    @IsInt()
    @Min(1)
    @IsOptional()
    duration_hours?: number;

    @ApiPropertyOptional({ example: 'https://example.com/thumbnail.jpg', description: 'Course thumbnail URL' })
    @IsString()
    @IsUrl()
    @IsOptional()
    thumbnail_url?: string;

    // Sessions with lessons
    @ApiProperty({ type: [CreateSessionWithLessonsDto], description: 'Sessions with lessons' })
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => CreateSessionWithLessonsDto)
    sessions: CreateSessionWithLessonsDto[];
}
