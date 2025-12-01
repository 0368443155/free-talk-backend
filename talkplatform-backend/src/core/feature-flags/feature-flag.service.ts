import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FeatureFlag } from './entities/feature-flag.entity';
import { Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

@Injectable()
export class FeatureFlagService {
  private readonly logger = new Logger(FeatureFlagService.name);

  constructor(
    @InjectRepository(FeatureFlag)
    private readonly featureFlagRepository: Repository<FeatureFlag>,
    @Inject(CACHE_MANAGER)
    private readonly cacheManager: Cache,
  ) {}

  /**
   * Check if a feature is enabled
   */
  async isEnabled(flagName: string): Promise<boolean> {
    try {
      // Try cache first
      const cacheKey = `feature_flag:${flagName}`;
      const cached = await this.cacheManager.get<boolean>(cacheKey);

      if (cached !== undefined) {
        return cached;
      }

      // Get from database
      const flag = await this.featureFlagRepository.findOne({
        where: { name: flagName },
      });

      if (!flag) {
        this.logger.warn(`Feature flag not found: ${flagName}`);
        return false;
      }

      const isEnabled = flag.enabled && flag.rollout_percentage >= 100;

      // Cache for 1 minute
      await this.cacheManager.set(cacheKey, isEnabled, 60000);

      return isEnabled;
    } catch (error) {
      this.logger.error(`Error checking feature flag ${flagName}: ${error.message}`);
      return false;
    }
  }

  /**
   * Check if user is in rollout percentage
   */
  async isEnabledForUser(flagName: string, userId: string): Promise<boolean> {
    try {
      const flag = await this.featureFlagRepository.findOne({
        where: { name: flagName },
      });

      if (!flag || !flag.enabled) {
        return false;
      }

      // If 100% rollout, return true
      if (flag.rollout_percentage >= 100) {
        return true;
      }

      // Use consistent hashing to determine if user is in rollout
      const hash = this.hashUserId(userId);
      const userPercentage = hash % 100;

      return userPercentage < flag.rollout_percentage;
    } catch (error) {
      this.logger.error(`Error checking feature flag for user: ${error.message}`);
      return false;
    }
  }

  /**
   * Enable a feature flag
   */
  async enable(flagName: string, rolloutPercentage: number = 100): Promise<void> {
    await this.featureFlagRepository.update(
      { name: flagName },
      {
        enabled: true,
        rollout_percentage: rolloutPercentage,
        updated_at: new Date(),
      },
    );

    // Clear cache
    await this.cacheManager.del(`feature_flag:${flagName}`);

    this.logger.log(
      `Feature flag enabled: ${flagName} (${rolloutPercentage}%)`,
    );
  }

  /**
   * Disable a feature flag
   */
  async disable(flagName: string): Promise<void> {
    await this.featureFlagRepository.update(
      { name: flagName },
      {
        enabled: false,
        rollout_percentage: 0,
        updated_at: new Date(),
      },
    );

    // Clear cache
    await this.cacheManager.del(`feature_flag:${flagName}`);

    this.logger.log(`Feature flag disabled: ${flagName}`);
  }

  /**
   * Update rollout percentage
   */
  async updateRollout(flagName: string, rolloutPercentage: number): Promise<void> {
    await this.featureFlagRepository.update(
      { name: flagName },
      {
        rollout_percentage: rolloutPercentage,
        updated_at: new Date(),
      },
    );

    // Clear cache
    await this.cacheManager.del(`feature_flag:${flagName}`);

    this.logger.log(
      `Feature flag rollout updated: ${flagName} (${rolloutPercentage}%)`,
    );
  }

  /**
   * Get all feature flags
   */
  async getAll(): Promise<FeatureFlag[]> {
    return this.featureFlagRepository.find({
      order: { name: 'ASC' },
    });
  }

  /**
   * Get feature flag by name
   */
  async getByName(flagName: string): Promise<FeatureFlag | null> {
    return this.featureFlagRepository.findOne({
      where: { name: flagName },
    });
  }

  /**
   * Hash user ID for consistent rollout
   */
  private hashUserId(userId: string): number {
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      const char = userId.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash);
  }
}

