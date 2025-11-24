import { IsNotEmpty, IsString, IsOptional, IsArray, ValidateNested, IsNumber, IsEmail } from 'class-validator';
import { Type } from 'class-transformer';

export class DocumentDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsString()
  key: string; // Storage key hoặc URL

  @IsOptional()
  @IsNumber()
  year?: number;

  @IsOptional()
  @IsString()
  issuer?: string;
}

export class ReferenceDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsEmail()
  email: string;

  @IsNotEmpty()
  @IsString()
  relationship: string; // 'colleague', 'supervisor', 'student', etc.
}

export class SubmitVerificationDto {
  // Identity Documents (URLs to uploaded files)
  @IsNotEmpty()
  @IsString()
  identity_card_front: string; // URL to uploaded image file

  @IsNotEmpty()
  @IsString()
  identity_card_back: string; // URL to uploaded image file

  // Degree Certificates (URLs to uploaded files)
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DocumentDto)
  degree_certificates?: Array<{
    name: string;
    file_url: string; // URL to uploaded image file
    year?: number;
  }>;

  // Teaching Certificates (URLs to uploaded files)
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DocumentDto)
  teaching_certificates?: Array<{
    name: string;
    issuer?: string;
    file_url: string; // URL to uploaded image file
    year?: number;
  }>;

  // CV/Resume (URL to uploaded PDF file)
  @IsOptional()
  @IsString()
  cv_url?: string; // URL to uploaded PDF file

  // Additional Info
  @IsOptional()
  @IsNumber()
  years_of_experience?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  previous_platforms?: string[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReferenceDto)
  references?: ReferenceDto[];
}


