import { IsNumber, IsString, IsObject, IsOptional, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

class BankAccountInfoDto {
  @ApiProperty()
  @IsString()
  bank_name: string;

  @ApiProperty()
  @IsString()
  account_number: string;

  @ApiProperty()
  @IsString()
  account_name: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  branch?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  swift_code?: string;
}

export class CreateWithdrawalDto {
  @ApiProperty({ minimum: 10 })
  @IsNumber()
  @Min(10)
  amount: number;

  @ApiProperty()
  @IsObject()
  @ValidateNested()
  @Type(() => BankAccountInfoDto)
  bank_account_info: BankAccountInfoDto;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  notes?: string;
}

