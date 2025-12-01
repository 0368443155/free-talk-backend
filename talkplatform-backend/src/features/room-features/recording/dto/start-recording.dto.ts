import { IsString, IsNotEmpty, IsOptional, IsEnum } from 'class-validator';
import { RecordingQuality } from '../entities/recording.entity';

export class StartRecordingDto {
  @IsString()
  @IsNotEmpty()
  roomId: string;

  @IsString()
  @IsNotEmpty()
  livekitRoomName: string;

  @IsEnum(RecordingQuality)
  @IsOptional()
  quality?: RecordingQuality;
}

