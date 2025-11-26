import { IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class ApproveVerificationDto {
  @ApiPropertyOptional({ description: 'Admin notes for this approval' })
  @IsOptional()
  @IsString()
  notes?: string;
}

