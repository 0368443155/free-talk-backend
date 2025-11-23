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
  // Identity Documents
  @IsNotEmpty()
  @IsString()
  identity_card_front: string; // Storage key

  @IsNotEmpty()
  @IsString()
  identity_card_back: string; // Storage key

  // Degree Certificates
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DocumentDto)
  degree_certificates?: DocumentDto[];

  // Teaching Certificates (TEFL, TESOL, etc.)
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DocumentDto)
  teaching_certificates?: DocumentDto[];

  // CV/Resume
  @IsOptional()
  @IsString()
  cv_url?: string;

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


