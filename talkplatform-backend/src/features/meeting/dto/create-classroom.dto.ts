// src/features/meeting/dto/create-classroom.dto.ts
import { IsString, IsOptional, IsBoolean, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateClassroomDto {
  @ApiProperty({ description: 'Classroom name' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'Classroom description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Is classroom active', default: true })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;

  @ApiPropertyOptional({ description: 'Cover image URL' })
  @IsOptional()
  @IsString()
  cover_image?: string;

  @ApiPropertyOptional({ description: 'Classroom settings' })
  @IsOptional()
  @IsObject()
  settings?: any;
}