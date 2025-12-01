import { IsString, IsNotEmpty, IsOptional, IsBoolean } from 'class-validator';
import { RoomType } from '../../../core/room/enums/room-type.enum';

export class JoinRoomDto {
  @IsString()
  @IsNotEmpty()
  roomId: string;

  @IsString()
  @IsNotEmpty()
  roomType: RoomType;

  @IsBoolean()
  @IsOptional()
  isHost?: boolean;

  @IsOptional()
  metadata?: Record<string, any>;
}

