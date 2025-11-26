import {
    IsString,
    IsNotEmpty,
    IsInt,
    IsOptional,
    Min,
    IsDateString,
    Matches,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateSessionDto {
    @ApiProperty({
        example: 1,
        description: 'Session number (must be unique within course)',
        minimum: 1
    })
    @IsInt()
    @Min(1)
    session_number: number;

    @ApiPropertyOptional({
        example: 'Introduction to English Conversation',
        description: 'Session title'
    })
    @IsString()
    @IsOptional()
    title?: string;

    @ApiPropertyOptional({
        example: 'Learn basic greetings and introductions',
        description: 'Session description'
    })
    @IsString()
    @IsOptional()
    description?: string;

    @ApiProperty({
        example: '2025-12-01',
        description: 'Scheduled date (YYYY-MM-DD)'
    })
    @IsDateString()
    scheduled_date: string;

    @ApiProperty({
        example: '10:00',
        description: 'Start time (HH:MM)'
    })
    @IsString()
    @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, {
        message: 'Start time must be in HH:MM format'
    })
    start_time: string;

    @ApiProperty({
        example: '11:30',
        description: 'End time (HH:MM)'
    })
    @IsString()
    @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, {
        message: 'End time must be in HH:MM format'
    })
    end_time: string;

    @ApiPropertyOptional({
        example: 90,
        description: 'Duration in minutes (auto-calculated from start_time and end_time if not provided)',
        minimum: 15
    })
    @IsInt()
    @Min(15, { message: 'Session must be at least 15 minutes' })
    @IsOptional()
    duration_minutes?: number;
}

export class UpdateSessionDto {
    @ApiPropertyOptional({ example: 'Introduction to English Conversation' })
    @IsString()
    @IsOptional()
    title?: string;

    @ApiPropertyOptional({ example: 'Learn basic greetings...' })
    @IsString()
    @IsOptional()
    description?: string;

    @ApiPropertyOptional({ example: '2025-12-01' })
    @IsDateString()
    @IsOptional()
    scheduled_date?: string;

    @ApiPropertyOptional({ example: '10:00' })
    @IsString()
    @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
    @IsOptional()
    start_time?: string;

    @ApiPropertyOptional({ example: '11:30' })
    @IsString()
    @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
    @IsOptional()
    end_time?: string;

    @ApiPropertyOptional({ example: 90, minimum: 15 })
    @IsInt()
    @Min(15)
    @IsOptional()
    duration_minutes?: number;
}
