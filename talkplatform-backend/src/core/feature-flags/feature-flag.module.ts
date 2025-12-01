import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FeatureFlag } from './entities/feature-flag.entity';
import { FeatureFlagService } from './feature-flag.service';
import { FeatureFlagController } from './feature-flag.controller';
import { RolloutService } from './services/rollout.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([FeatureFlag]),
  ],
  controllers: [FeatureFlagController],
  providers: [FeatureFlagService, RolloutService],
  exports: [FeatureFlagService, RolloutService],
})
export class FeatureFlagModule {}

