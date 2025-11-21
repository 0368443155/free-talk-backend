import { IsString, IsOptional, IsBoolean, IsNumber, IsDateString, IsEnum, IsArray, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MeetingType, MeetingLevel, PricingType } from '../../meeting/entities/meeting.entity';

export class CreateLiveKitRoomDto {
  @ApiProperty({ description: 'Room title' })
  @IsString()
  title: string;

  @ApiPropertyOptional({ description: 'Room description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Language for the room', default: 'English' })
  @IsOptional()
  @IsString()
  language?: string;

  @ApiPropertyOptional({ description: 'Skill level', enum: MeetingLevel, default: MeetingLevel.ALL })
  @IsOptional()
  @IsEnum(MeetingLevel)
  level?: MeetingLevel;

  @ApiPropertyOptional({ description: 'Discussion topic' })
  @IsOptional()
  @IsString()
  topic?: string;

  @ApiPropertyOptional({ description: 'Geographic region', example: 'US-West' })
  @IsOptional()
  @IsString()
  region?: string;

  @ApiPropertyOptional({ description: 'Topic tags', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ description: 'Maximum participants', default: 4 })
  @IsOptional()
  @IsNumber()
  @Min(2)
  @Max(1000)
  max_participants?: number;

  @ApiPropertyOptional({ description: 'Audio-first room (minimal video)', default: true })
  @IsOptional()
  @IsBoolean()
  is_audio_first?: boolean;

  @ApiPropertyOptional({ description: 'Private room (not discoverable)', default: false })
  @IsOptional()
  @IsBoolean()
  is_private?: boolean;

  @ApiPropertyOptional({ description: 'Requires host approval to join', default: false })
  @IsOptional()
  @IsBoolean()
  requires_approval?: boolean;

  // Teacher class specific fields
  @ApiPropertyOptional({ description: 'Scheduled start time for teacher classes' })
  @IsOptional()
  @IsDateString()
  scheduled_at?: string;

  @ApiPropertyOptional({ description: 'Price in credits', default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  price_credits?: number;

  @ApiPropertyOptional({ description: 'Pricing model', enum: PricingType, default: PricingType.FREE })
  @IsOptional()
  @IsEnum(PricingType)
  pricing_type?: PricingType;

  @ApiPropertyOptional({ description: 'Teacher affiliate code' })
  @IsOptional()
  @IsString()
  affiliate_code?: string;

  @ApiPropertyOptional({ description: 'Allow screen sharing', default: true })
  @IsOptional()
  @IsBoolean()
  allow_screen_share?: boolean;

  @ApiPropertyOptional({ description: 'Allow chat', default: true })
  @IsOptional()
  @IsBoolean()
  allow_chat?: boolean;

  @ApiPropertyOptional({ description: 'Record session', default: false })
  @IsOptional()
  @IsBoolean()
  record_session?: boolean;
}

export class JoinLiveKitRoomDto {
  @ApiPropertyOptional({ description: 'Join as audio only', default: false })
  @IsOptional()
  @IsBoolean()
  audio_only?: boolean;

  @ApiPropertyOptional({ description: 'Join muted', default: false })
  @IsOptional()
  @IsBoolean()
  join_muted?: boolean;

  @ApiPropertyOptional({ description: 'Join with video off', default: false })
  @IsOptional()
  @IsBoolean()
  video_off?: boolean;

  @ApiPropertyOptional({ description: 'Display name override' })
  @IsOptional()
  @IsString()
  display_name?: string;
}

export class RoomFiltersDto {
  @ApiPropertyOptional({ description: 'Filter by language' })
  @IsOptional()
  @IsString()
  language?: string;

  @ApiPropertyOptional({ description: 'Filter by skill level', enum: MeetingLevel })
  @IsOptional()
  @IsEnum(MeetingLevel)
  level?: MeetingLevel;

  @ApiPropertyOptional({ description: 'Filter by region' })
  @IsOptional()
  @IsString()
  region?: string;

  @ApiPropertyOptional({ description: 'Filter by topic' })
  @IsOptional()
  @IsString()
  topic?: string;

  @ApiPropertyOptional({ description: 'Minimum price in credits' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  min_price?: number;

  @ApiPropertyOptional({ description: 'Maximum price in credits' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  max_price?: number;

  @ApiPropertyOptional({ description: 'Filter by teacher ID' })
  @IsOptional()
  @IsString()
  teacher_id?: string;

  @ApiPropertyOptional({ description: 'Only show scheduled classes' })
  @IsOptional()
  @IsBoolean()
  scheduled_only?: boolean;

  @ApiPropertyOptional({ description: 'Only show rooms with available slots' })
  @IsOptional()
  @IsBoolean()
  available_only?: boolean;
}