import { IsNumber, Min, Max } from 'class-validator';

export class GradualRolloutDto {
  @IsNumber()
  @Min(0)
  @Max(100)
  targetPercentage: number;

  @IsNumber()
  @Min(0)
  @Max(100)
  currentPercentage?: number;
}

