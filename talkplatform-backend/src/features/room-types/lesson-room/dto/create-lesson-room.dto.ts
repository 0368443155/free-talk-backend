import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateLessonRoomDto {
  @IsString()
  @IsNotEmpty()
  lessonId: string;

  @IsString()
  @IsOptional()
  title?: string;
}

