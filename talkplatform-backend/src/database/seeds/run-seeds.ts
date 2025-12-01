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
  // Use require for dynamic import to avoid module resolution issues
  // Path: src/database/seeds/ -> root = ../../../data-source
  // data-source.ts exports default, so we need to access .default
  const dataSourceModule = require('../../../data-source');
  const dataSource = dataSourceModule.default || dataSourceModule.dataSource;
  
  if (!dataSource) {
    console.error('❌ Could not find dataSource in data-source.ts');
    process.exit(1);
  }
  
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
}

