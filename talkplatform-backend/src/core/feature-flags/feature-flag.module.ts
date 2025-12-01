import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FeatureFlag } from './entities/feature-flag.entity';
import { FeatureFlagService } from './feature-flag.service';
import { FeatureFlagController } from './feature-flag.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([FeatureFlag]),
  ],
  controllers: [FeatureFlagController],
  providers: [FeatureFlagService],
  exports: [FeatureFlagService],
})
export class FeatureFlagModule {}

