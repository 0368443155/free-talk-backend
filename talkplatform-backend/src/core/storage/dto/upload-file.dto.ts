import { IsOptional, IsString, IsInt, Min, Max } from 'class-validator';

export class UploadFileDto {
  @IsOptional()
  @IsString()
  key?: string;

  @IsOptional()
  @IsString()
  folder?: string;
}

export class GetPresignedUrlDto {
  @IsString()
  key: string;

  @IsString()
  mimeType: string;

  @IsOptional()
  @IsInt()
  @Min(60) // Minimum 1 minute
  @Max(604800) // Maximum 7 days
  expiresIn?: number;
}

