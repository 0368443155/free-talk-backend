import { DataSource } from 'typeorm';
import { seedFeatureFlags } from './feature-flags.seed';

export async function runSeeds(dataSource: DataSource): Promise<void> {
  console.log('🌱 Starting database seeds...');

  try {
    await seedFeatureFlags(dataSource);
    console.log('✅ All seeds completed successfully');
  } catch (error) {
    console.error('❌ Error running seeds:', error);
    throw error;
  }
}

// For CLI usage
if (require.main === module) {
  import('../../data-source').then(({ dataSource }) => {
    dataSource
      .initialize()
      .then(async () => {
        await runSeeds(dataSource);
        await dataSource.destroy();
        process.exit(0);
      })
      .catch((error) => {
        console.error('Error:', error);
        process.exit(1);
      });
  });
}

