import { IsNotEmpty, IsString, IsOptional, IsArray, ValidateNested, IsNumber, IsEmail } from 'class-validator';
import { Type } from 'class-transformer';

export class DocumentDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsString()
  key: string; // Storage key hoặc URL (deprecated, use file_url instead)

  @IsOptional()
  @IsNumber()
  year?: number;

  @IsOptional()
  @IsString()
  issuer?: string;
}

// DTO cho degree certificates (sử dụng file_url)
export class DegreeCertificateDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsString()
  file_url: string; // URL to uploaded image file

  @IsOptional()
  @IsNumber()
  year?: number;
}

// DTO cho teaching certificates (sử dụng file_url)
export class TeachingCertificateDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  issuer?: string;

  @IsNotEmpty()
  @IsString()
  file_url: string; // URL to uploaded image file

  @IsOptional()
  @IsNumber()
  year?: number;
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
  @Type(() => DegreeCertificateDto)
  degree_certificates?: DegreeCertificateDto[];

  // Teaching Certificates (URLs to uploaded files)
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TeachingCertificateDto)
  teaching_certificates?: TeachingCertificateDto[];

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


