import { IsNumber, Min, Max } from 'class-validator';

export class UpdateFeatureFlagDto {
  @IsNumber()
  @Min(0)
  @Max(100)
  rolloutPercentage: number;
}

