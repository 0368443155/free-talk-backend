import { IsString, IsOptional, IsBoolean, IsNumber, IsDateString, IsObject, Min, Max, IsNotEmpty, IsEnum, IsArray } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MeetingStatus, MeetingLevel, RoomStatus, MeetingType, PricingType } from '../entities/meeting.entity';

export class CreateMeetingDto {
  @ApiProperty({ description: 'Meeting title' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiPropertyOptional({ description: 'Meeting description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Is meeting private', default: false })
  @IsOptional()
  @IsBoolean()
  is_private?: boolean;

  @ApiPropertyOptional({ description: 'Is meeting locked', default: false })
  @IsOptional()
  @IsBoolean()
  is_locked?: boolean;

  @ApiPropertyOptional({ description: 'Meeting status', enum: MeetingStatus })
  @IsOptional()
  status?: MeetingStatus;

  @ApiPropertyOptional({ description: 'Scheduled date and time' })
  @IsOptional()
  @IsDateString()
  scheduled_at?: string;

  @ApiPropertyOptional({ description: 'Maximum participants', default: 10 })
  @IsOptional()
  @IsNumber()
  @Min(2)
  @Max(10)
  max_participants?: number;

  @ApiPropertyOptional({ description: 'YouTube video ID for watch together' })
  @IsOptional()
  @IsString()
  youtube_video_id?: string;

  @ApiPropertyOptional({ description: 'Meeting settings' })
  @IsOptional()
  @IsObject()
  settings?: {
    allow_screen_share?: boolean;
    allow_chat?: boolean;
    allow_reactions?: boolean;
    record_meeting?: boolean;
    waiting_room?: boolean;
    auto_record?: boolean;
    mute_on_join?: boolean;
  };

  @ApiPropertyOptional({ description: 'Language for the meeting', example: 'English' })
  @IsOptional()
  @IsString()
  language?: string;

  @ApiPropertyOptional({ description: 'Meeting level', enum: MeetingLevel })
  @IsOptional()
  @IsEnum(MeetingLevel)
  level?: MeetingLevel;

  @ApiPropertyOptional({ description: 'Topic of discussion', example: 'Daily Conversation' })
  @IsOptional()
  @IsString()
  topic?: string;

  @ApiPropertyOptional({ description: 'Allow microphone in meeting', default: true })
  @IsOptional()
  @IsBoolean()
  allow_microphone?: boolean;

  @ApiPropertyOptional({ description: 'Allow participants to unmute themselves', default: true })
  @IsOptional()
  @IsBoolean()
  participants_can_unmute?: boolean;

  // New enhanced fields for free talk and teacher classes
  @ApiPropertyOptional({ description: 'Type of meeting', enum: MeetingType, default: MeetingType.FREE_TALK })
  @IsOptional()
  @IsEnum(MeetingType)
  meeting_type?: MeetingType;

  @ApiPropertyOptional({ description: 'Price in credits for paid meetings', default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  price_credits?: number;

  @ApiPropertyOptional({ description: 'Pricing model', enum: PricingType, default: PricingType.FREE })
  @IsOptional()
  @IsEnum(PricingType)
  pricing_type?: PricingType;

  @ApiPropertyOptional({ description: 'Geographic region for location-based matching', example: 'US-West' })
  @IsOptional()
  @IsString()
  region?: string;

  @ApiPropertyOptional({ description: 'Topic tags for better discoverability', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ description: 'Audio-first meeting (minimal video)', default: true })
  @IsOptional()
  @IsBoolean()
  is_audio_first?: boolean;

  @ApiPropertyOptional({ description: 'Requires host approval to join', default: false })
  @IsOptional()
  @IsBoolean()
  requires_approval?: boolean;

  @ApiPropertyOptional({ description: 'Teacher affiliate code for revenue tracking' })
  @IsOptional()
  @IsString()
  affiliate_code?: string;
}

