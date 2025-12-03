import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsNumber,
  IsArray,
  ValidateNested,
  Min,
  Max,
  IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// Session Structure DTO
export class SessionStructureDto {
  @ApiProperty({ description: 'Session number in sequence', example: 1 })
  @IsNumber()
  sessionNumber: number;

  @ApiProperty({ description: 'Session title', example: 'Introduction & Basics' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiPropertyOptional({ description: 'Session description' })
  @IsString()
  @IsOptional()
  description?: string | '';

  @ApiProperty({ description: 'Duration in minutes', example: 120, minimum: 30, maximum: 480 })
  @IsNumber()
  @Min(30)
  @Max(480)
  durationMinutes: number;

  @ApiProperty({ description: 'Topics covered in this session', example: ['Introduction', 'Basic Concepts'] })
  @IsArray()
  @IsString({ each: true })
  topics: string[];

  @ApiProperty({ description: 'Number of lessons in this session', example: 3, minimum: 1 })
  @IsNumber()
  @Min(1)
  lessonCount: number;
}

// Create Template DTO
export class CreateTemplateDto {
  @ApiProperty({ description: 'Template name', example: 'English Conversation - Beginner' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ description: 'Template description' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ description: 'Make template public', default: false })
  @IsBoolean()
  @IsOptional()
  isPublic?: boolean;

  @ApiPropertyOptional({ description: 'Course category', example: 'English' })
  @IsString()
  @IsOptional()
  category?: string;

  @ApiPropertyOptional({ description: 'Course level', example: 'beginner' })
  @IsString()
  @IsOptional()
  level?: string;

  @ApiPropertyOptional({ description: 'Course language', example: 'en' })
  @IsString()
  @IsOptional()
  language?: string;

  @ApiPropertyOptional({ description: 'Sessions per week', example: 2 })
  @IsNumber()
  @IsOptional()
  @Min(1)
  sessionsPerWeek?: number;

  @ApiProperty({ description: 'Session structure', type: [SessionStructureDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SessionStructureDto)
  sessionStructure: SessionStructureDto[];

  @ApiPropertyOptional({ description: 'Suggested full course price', example: 299.99 })
  @IsNumber()
  @IsOptional()
  @Min(0)
  suggestedPriceFull?: number;

  @ApiPropertyOptional({ description: 'Suggested price per session', example: 19.99 })
  @IsNumber()
  @IsOptional()
  @Min(0)
  suggestedPriceSession?: number;

  @ApiPropertyOptional({ description: 'Template tags', example: ['english', 'conversation', 'beginner'] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];
}

// Update Template DTO
export class UpdateTemplateDto {
  @ApiPropertyOptional({ description: 'Template name' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ description: 'Template description' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ description: 'Make template public' })
  @IsBoolean()
  @IsOptional()
  isPublic?: boolean;

  @ApiPropertyOptional({ description: 'Course category' })
  @IsString()
  @IsOptional()
  category?: string;

  @ApiPropertyOptional({ description: 'Course level' })
  @IsString()
  @IsOptional()
  level?: string;

  @ApiPropertyOptional({ description: 'Course language' })
  @IsString()
  @IsOptional()
  language?: string;

  @ApiPropertyOptional({ description: 'Sessions per week' })
  @IsNumber()
  @IsOptional()
  @Min(1)
  sessionsPerWeek?: number;

  @ApiPropertyOptional({ description: 'Session structure', type: [SessionStructureDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SessionStructureDto)
  @IsOptional()
  sessionStructure?: SessionStructureDto[];

  @ApiPropertyOptional({ description: 'Suggested full course price' })
  @IsNumber()
  @IsOptional()
  @Min(0)
  suggestedPriceFull?: number;

  @ApiPropertyOptional({ description: 'Suggested price per session' })
  @IsNumber()
  @IsOptional()
  @Min(0)
  suggestedPriceSession?: number;

  @ApiPropertyOptional({ description: 'Template tags' })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];
}

// Get Templates Query DTO
export class GetTemplatesDto {
  @ApiPropertyOptional({ description: 'Filter by category' })
  @IsString()
  @IsOptional()
  category?: string;

  @ApiPropertyOptional({ description: 'Filter by level' })
  @IsString()
  @IsOptional()
  level?: string;

  @ApiPropertyOptional({ description: 'Filter by language' })
  @IsString()
  @IsOptional()
  language?: string;

  @ApiPropertyOptional({ description: 'Filter by public status' })
  @IsBoolean()
  @IsOptional()
  isPublic?: boolean;

  @ApiPropertyOptional({ description: 'Filter by featured status' })
  @IsBoolean()
  @IsOptional()
  isFeatured?: boolean;

  @ApiPropertyOptional({ description: 'Filter by creator user ID' })
  @IsString()
  @IsOptional()
  createdBy?: string;

  @ApiPropertyOptional({ description: 'Filter by tags', type: [String] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];

  @ApiPropertyOptional({ description: 'Page number', default: 1, minimum: 1 })
  @IsNumber()
  @IsOptional()
  @Min(1)
  @Type(() => Number)
  page?: number;

  @ApiPropertyOptional({ description: 'Items per page', default: 20, minimum: 1, maximum: 100 })
  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number;

  @ApiPropertyOptional({ description: 'Sort field', enum: ['usageCount', 'rating', 'createdAt'], default: 'createdAt' })
  @IsString()
  @IsOptional()
  sortBy?: 'usageCount' | 'rating' | 'createdAt';

  @ApiPropertyOptional({ description: 'Sort order', enum: ['ASC', 'DESC'], default: 'DESC' })
  @IsString()
  @IsOptional()
  sortOrder?: 'ASC' | 'DESC';
}

// Create Course From Template DTO
export class CreateFromTemplateDto {
  @ApiProperty({ description: 'Course title', example: 'English Conversation - Winter 2025' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiPropertyOptional({ description: 'Course description' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ description: 'Course start date', example: '2025-01-15T00:00:00Z' })
  @IsDateString()
  startDate: string;

  @ApiPropertyOptional({ description: 'Full course price' })
  @IsNumber()
  @IsOptional()
  @Min(0)
  priceFullCourse?: number;

  @ApiPropertyOptional({ description: 'Price per session' })
  @IsNumber()
  @IsOptional()
  @Min(0)
  pricePerSession?: number;

  @ApiPropertyOptional({ description: 'Maximum students', default: 30 })
  @IsNumber()
  @IsOptional()
  @Min(1)
  maxStudents?: number;
}

// Rate Template DTO
export class RateTemplateDto {
  @ApiProperty({ description: 'Rating (1-5)', example: 5, minimum: 1, maximum: 5 })
  @IsNumber()
  @Min(1)
  @Max(5)
  rating: number;

  @ApiPropertyOptional({ description: 'Review text' })
  @IsString()
  @IsOptional()
  review?: string;
}

