import { IsString, IsNumber, IsEnum, IsOptional, IsObject, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentProvider } from '../entities/credit-transaction.entity';

export class PurchaseCreditsDto {
  @ApiProperty({ description: 'Credit package ID to purchase' })
  @IsString()
  package_id: string;

  @ApiProperty({ description: 'Payment provider', enum: PaymentProvider })
  @IsEnum(PaymentProvider)
  payment_provider: PaymentProvider;

  @ApiPropertyOptional({ description: 'Additional payment metadata' })
  @IsOptional()
  @IsObject()
  payment_metadata?: any;

  @ApiPropertyOptional({ description: 'Return URL after payment' })
  @IsOptional()
  @IsString()
  return_url?: string;

  @ApiPropertyOptional({ description: 'Cancel URL for payment' })
  @IsOptional()
  @IsString()
  cancel_url?: string;
}

export class DonateCreditsDto {
  @ApiProperty({ description: 'Amount of credits to donate', minimum: 1, maximum: 1000 })
  @IsNumber()
  @Min(1)
  @Max(1000)
  amount: number;

  @ApiPropertyOptional({ description: 'Optional message with donation' })
  @IsOptional()
  @IsString()
  message?: string;

  @ApiPropertyOptional({ description: 'Anonymous donation', default: false })
  @IsOptional()
  anonymous?: boolean;
}

export class WithdrawCreditsDto {
  @ApiProperty({ description: 'Amount to withdraw (in credits)', minimum: 10 })
  @IsNumber()
  @Min(10)
  amount: number;

  @ApiProperty({ description: 'Payment method for withdrawal' })
  @IsString()
  payment_method: string; // 'bank_transfer', 'paypal', 'crypto', etc.

  @ApiProperty({ description: 'Payment details' })
  @IsObject()
  payment_details: {
    account_number?: string;
    bank_name?: string;
    paypal_email?: string;
    wallet_address?: string;
    [key: string]: any;
  };

  @ApiPropertyOptional({ description: 'Notes for withdrawal' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class AdjustCreditsDto {
  @ApiProperty({ description: 'Credit adjustment amount (can be negative)' })
  @IsNumber()
  amount: number;

  @ApiProperty({ description: 'Reason for adjustment' })
  @IsString()
  reason: string;

  @ApiPropertyOptional({ description: 'Admin notes' })
  @IsOptional()
  @IsString()
  admin_notes?: string;
}