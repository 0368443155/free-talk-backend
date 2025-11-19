import { IsString, IsOptional, IsBoolean, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum ParticipantRole {
  HOST = 'host',
  MODERATOR = 'moderator', 
  PARTICIPANT = 'participant',
  WAITING = 'waiting',
}

export enum BotType {
  RECORDER = 'recorder',
  ASSISTANT = 'assistant',
  TRANSCRIBER = 'transcriber',
}

export class GenerateTokenDto {
  @ApiProperty({
    description: 'Meeting ID to join',
    example: '550e8400-e29b-41d4-a716-446655440000'
  })
  @IsString()
  meetingId: string;

  @ApiProperty({
    description: 'Participant role in the meeting',
    enum: ParticipantRole,
    example: ParticipantRole.PARTICIPANT,
    required: false
  })
  @IsOptional()
  @IsEnum(ParticipantRole)
  participantRole?: ParticipantRole = ParticipantRole.PARTICIPANT;
}

export class GenerateBotTokenDto {
  @ApiProperty({
    description: 'Meeting ID for bot to join',
    example: '550e8400-e29b-41d4-a716-446655440000'
  })
  @IsString()
  meetingId: string;

  @ApiProperty({
    description: 'Type of bot being created',
    enum: BotType,
    example: BotType.RECORDER,
    required: false
  })
  @IsOptional()
  @IsEnum(BotType)
  botType?: BotType = BotType.ASSISTANT;

  @ApiProperty({
    description: 'Custom name for the bot',
    example: 'Meeting Recorder',
    required: false
  })
  @IsOptional()
  @IsString()
  botName?: string;
}

export class AdmitParticipantDto {
  @ApiProperty({
    description: 'Meeting ID',
    example: '550e8400-e29b-41d4-a716-446655440000'
  })
  @IsString()
  meetingId: string;

  @ApiProperty({
    description: 'Participant ID to admit',
    example: 'user-123'
  })
  @IsString()
  participantId: string;
}

export class ValidateTokenDto {
  @ApiProperty({
    description: 'LiveKit JWT token to validate',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
  })
  @IsString()
  token: string;
}