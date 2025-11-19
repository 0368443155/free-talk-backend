import { IsString, IsNumber, IsOptional, IsDateString } from 'class-validator';

export class CreateMetricDto {
  @IsString()
  endpoint: string;

  @IsString()
  method: string;

  @IsNumber()
  statusCode: number;

  @IsNumber()
  responseTimeMs: number;

  @IsNumber()
  inboundBytes: number;

  @IsNumber()
  outboundBytes: number;

  @IsNumber()
  activeConnections: number;

  @IsOptional()
  @IsNumber()
  userId?: number;

  @IsOptional()
  @IsDateString()
  timestamp?: string;
}