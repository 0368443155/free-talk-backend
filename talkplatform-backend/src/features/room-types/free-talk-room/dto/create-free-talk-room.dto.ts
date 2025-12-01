import { IsString, IsNotEmpty, IsOptional, MaxLength } from 'class-validator';

export class CreateFreeTalkRoomDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title: string;

  @IsString()
  @IsOptional()
  @MaxLength(1000)
  description?: string;
}

