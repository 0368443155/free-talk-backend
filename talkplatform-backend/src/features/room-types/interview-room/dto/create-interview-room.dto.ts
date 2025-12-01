import { IsString, IsNotEmpty, IsOptional, MaxLength } from 'class-validator';

export class CreateInterviewRoomDto {
  @IsString()
  @IsNotEmpty()
  intervieweeId: string;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  title?: string;
}

