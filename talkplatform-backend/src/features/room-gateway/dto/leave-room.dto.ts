import { IsString, IsNotEmpty } from 'class-validator';

export class LeaveRoomDto {
  @IsString()
  @IsNotEmpty()
  roomId: string;
}

