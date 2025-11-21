import { IsString, IsNumber, IsEnum, IsOptional, IsArray, IsBoolean, IsDateString, Min, Max, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TeacherSpecialty } from '../entities/teacher-profile.entity';
import { WeekDay, AvailabilityType } from '../entities/teacher-availability.entity';

export class CreateTeacherProfileDto {
  @ApiProperty({ description: 'Short headline/tagline' })
  @IsString()
  headline: string;

  @ApiProperty({ description: 'Detailed biography' })
  @IsString()
  bio: string;

  @ApiProperty({ description: 'Languages taught', type: [String] })
  @IsArray()
  @IsString({ each: true })
  languages_taught: string[];

  @ApiProperty({ description: 'Teaching specialties', enum: TeacherSpecialty, isArray: true })
  @IsArray()
  @IsEnum(TeacherSpecialty, { each: true })
  specialties: TeacherSpecialty[];

  @ApiPropertyOptional({ description: 'Education background' })
  @IsOptional()
  @IsString()
  education?: string;

  @ApiPropertyOptional({ description: 'Professional certifications' })
  @IsOptional()
  @IsArray()
  certifications?: Array<{
    name: string;
    issuer: string;
    year: number;
    image_url?: string;
  }>;

  @ApiProperty({ description: 'Years of teaching experience', minimum: 0, maximum: 50 })
  @IsNumber()
  @Min(0)
  @Max(50)
  years_experience: number;

  @ApiPropertyOptional({ description: 'Teacher timezone' })
  @IsOptional()
  @IsString()
  timezone?: string;

  @ApiPropertyOptional({ description: 'Spoken languages with proficiency levels' })
  @IsOptional()
  @IsArray()
  spoken_languages?: Array<{
    language: string;
    level: 'native' | 'fluent' | 'advanced' | 'intermediate';
  }>;

  @ApiProperty({ description: 'Hourly rate in credits', minimum: 0.1 })
  @IsNumber()
  @Min(0.1)
  hourly_rate_credits: number;

  @ApiPropertyOptional({ description: 'Minimum session duration in minutes', default: 30 })
  @IsOptional()
  @IsNumber()
  @Min(15)
  @Max(480)
  min_session_duration?: number;

  @ApiPropertyOptional({ description: 'Maximum session duration in minutes', default: 120 })
  @IsOptional()
  @IsNumber()
  @Min(30)
  @Max(480)
  max_session_duration?: number;

  @ApiPropertyOptional({ description: 'Teaching styles', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  teaching_styles?: string[];

  @ApiPropertyOptional({ description: 'Target age groups', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  age_groups?: string[];

  @ApiPropertyOptional({ description: 'Auto-approve bookings', default: true })
  @IsOptional()
  @IsBoolean()
  auto_approve_bookings?: boolean;

  @ApiPropertyOptional({ description: 'Booking lead time in hours', default: 24 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(168)
  booking_lead_time_hours?: number;
}

export class UpdateTeacherProfileDto {
  @ApiPropertyOptional({ description: 'Short headline/tagline' })
  @IsOptional()
  @IsString()
  headline?: string;

  @ApiPropertyOptional({ description: 'Detailed biography' })
  @IsOptional()
  @IsString()
  bio?: string;

  @ApiPropertyOptional({ description: 'Languages taught', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  languages_taught?: string[];

  @ApiPropertyOptional({ description: 'Teaching specialties', enum: TeacherSpecialty, isArray: true })
  @IsOptional()
  @IsArray()
  @IsEnum(TeacherSpecialty, { each: true })
  specialties?: TeacherSpecialty[];

  @ApiPropertyOptional({ description: 'Education background' })
  @IsOptional()
  @IsString()
  education?: string;

  @ApiPropertyOptional({ description: 'Professional certifications' })
  @IsOptional()
  @IsArray()
  certifications?: Array<{
    name: string;
    issuer: string;
    year: number;
    image_url?: string;
  }>;

  @ApiPropertyOptional({ description: 'Years of teaching experience' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(50)
  years_experience?: number;

  @ApiPropertyOptional({ description: 'Teacher timezone' })
  @IsOptional()
  @IsString()
  timezone?: string;

  @ApiPropertyOptional({ description: 'Hourly rate in credits' })
  @IsOptional()
  @IsNumber()
  @Min(0.1)
  hourly_rate_credits?: number;

  @ApiPropertyOptional({ description: 'Teaching styles', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  teaching_styles?: string[];

  @ApiPropertyOptional({ description: 'Target age groups', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  age_groups?: string[];

  @ApiPropertyOptional({ description: 'Teacher availability status' })
  @IsOptional()
  @IsBoolean()
  is_available?: boolean;

  @ApiPropertyOptional({ description: 'Auto-approve bookings' })
  @IsOptional()
  @IsBoolean()
  auto_approve_bookings?: boolean;

  @ApiPropertyOptional({ description: 'Booking lead time in hours' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(168)
  booking_lead_time_hours?: number;
}

export class CreateAvailabilityDto {
  @ApiProperty({ description: 'Availability type', enum: AvailabilityType })
  @IsEnum(AvailabilityType)
  availability_type: AvailabilityType;

  @ApiPropertyOptional({ description: 'Day of week for regular availability', enum: WeekDay })
  @IsOptional()
  @IsEnum(WeekDay)
  day_of_week?: WeekDay;

  @ApiPropertyOptional({ description: 'Specific date for exceptions' })
  @IsOptional()
  @IsDateString()
  date?: string;

  @ApiProperty({ description: 'Start time in HH:MM format' })
  @IsString()
  start_time: string;

  @ApiProperty({ description: 'End time in HH:MM format' })
  @IsString()
  end_time: string;

  @ApiPropertyOptional({ description: 'Timezone' })
  @IsOptional()
  @IsString()
  timezone?: string;

  @ApiPropertyOptional({ description: 'Available or blocked', default: true })
  @IsOptional()
  @IsBoolean()
  is_available?: boolean;

  @ApiPropertyOptional({ description: 'Notes for this availability slot' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ description: 'Maximum concurrent bookings' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(10)
  max_bookings?: number;
}

export class CreateReviewDto {
  @ApiProperty({ description: 'Overall rating', minimum: 1, maximum: 5 })
  @IsNumber()
  @Min(1)
  @Max(5)
  rating: number;

  @ApiPropertyOptional({ description: 'Review comment' })
  @IsOptional()
  @IsString()
  comment?: string;

  @ApiPropertyOptional({ description: 'Detailed ratings breakdown' })
  @IsOptional()
  @IsObject()
  detailed_ratings?: {
    teaching_quality?: number;
    communication?: number;
    punctuality?: number;
    preparation?: number;
    patience?: number;
  };

  @ApiPropertyOptional({ description: 'Review tags', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ description: 'Anonymous review', default: false })
  @IsOptional()
  @IsBoolean()
  is_anonymous?: boolean;

  @ApiPropertyOptional({ description: 'Meeting ID this review is for' })
  @IsOptional()
  @IsString()
  meeting_id?: string;
}

export class TeacherSearchFiltersDto {
  @ApiPropertyOptional({ description: 'Languages taught' })
  @IsOptional()
  @IsString()
  language?: string;

  @ApiPropertyOptional({ description: 'Teaching specialty', enum: TeacherSpecialty })
  @IsOptional()
  @IsEnum(TeacherSpecialty)
  specialty?: TeacherSpecialty;

  @ApiPropertyOptional({ description: 'Minimum rating', minimum: 1, maximum: 5 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  min_rating?: number;

  @ApiPropertyOptional({ description: 'Maximum hourly rate in credits' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  max_rate?: number;

  @ApiPropertyOptional({ description: 'Availability window' })
  @IsOptional()
  @IsString()
  availability?: 'now' | 'today' | 'week';

  @ApiPropertyOptional({ description: 'Experience level' })
  @IsOptional()
  @IsString()
  experience?: 'beginner' | 'intermediate' | 'expert';

  @ApiPropertyOptional({ description: 'Sort criteria' })
  @IsOptional()
  @IsString()
  sort?: 'rating' | 'price' | 'experience' | 'popularity' | 'newest';

  @ApiPropertyOptional({ description: 'Verified teachers only' })
  @IsOptional()
  @IsBoolean()
  verified_only?: boolean;

  @ApiPropertyOptional({ description: 'Available for instant booking' })
  @IsOptional()
  @IsBoolean()
  instant_booking?: boolean;

  @ApiPropertyOptional({ description: 'Native speakers only' })
  @IsOptional()
  @IsBoolean()
  native_speakers?: boolean;
}