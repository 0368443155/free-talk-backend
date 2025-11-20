import { IsString, IsNumber, IsIn, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateLiveKitMetricDto {
  @ApiProperty({ description: 'Meeting ID' })
  @IsString()
  meetingId: string;

  @ApiProperty({ description: 'User ID' })
  @IsString()
  userId: string;

  @ApiProperty({ description: 'Platform identifier', default: 'livekit' })
  @IsString()
  @IsIn(['livekit'])
  platform: string;

  @ApiProperty({ description: 'Timestamp of metric collection' })
  @IsNumber()
  timestamp: number;

  @ApiProperty({ description: 'Bitrate in bits per second' })
  @IsNumber()
  bitrate: number;

  @ApiProperty({ description: 'Packet loss percentage' })
  @IsNumber()
  packetLoss: number;

  @ApiProperty({ description: 'Jitter in milliseconds' })
  @IsNumber()
  jitter: number;

  @ApiProperty({ description: 'Round-trip time in milliseconds' })
  @IsNumber()
  rtt: number;

  @ApiProperty({ description: 'Connection quality rating' })
  @IsString()
  @IsIn(['excellent', 'good', 'fair', 'poor'])
  quality: 'excellent' | 'good' | 'fair' | 'poor';
}