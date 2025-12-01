import { DataSource } from 'typeorm';
import { FeatureFlag } from '../../core/feature-flags/entities/feature-flag.entity';

export async function seedFeatureFlags(dataSource: DataSource): Promise<void> {
  const featureFlagRepository = dataSource.getRepository(FeatureFlag);

  const featureFlags = [
    {
      name: 'use_new_gateway',
      enabled: false,
      rollout_percentage: 0,
      description: 'Use new modular gateway instead of old meetings.gateway.ts',
    },
    {
      name: 'use_cqrs_courses',
      enabled: true,
      rollout_percentage: 100,
      description: 'Use CQRS pattern for courses module',
    },
    {
      name: 'use_cqrs_meetings',
      enabled: false,
      rollout_percentage: 0,
      description: 'Use CQRS pattern for meetings module',
    },
    {
      name: 'enable_recording',
      enabled: false,
      rollout_percentage: 0,
      description: 'Enable cloud recording feature',
    },
    {
      name: 'enable_ai_features',
      enabled: false,
      rollout_percentage: 0,
      description: 'Enable AI features (transcription, translation)',
    },
    {
      name: 'enable_premium_tier',
      enabled: false,
      rollout_percentage: 0,
      description: 'Enable premium subscription tier',
    },
  ];

  for (const flag of featureFlags) {
    const existing = await featureFlagRepository.findOne({
      where: { name: flag.name },
    });

    if (!existing) {
      await featureFlagRepository.save(flag);
      console.log(`✅ Created feature flag: ${flag.name}`);
    } else {
      console.log(`⏭️  Feature flag already exists: ${flag.name}`);
    }
  }
}

