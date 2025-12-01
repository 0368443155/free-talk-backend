import { DataSource } from 'typeorm';
import { config } from 'dotenv';

config();

export interface ValidationResult {
  passed: boolean;
  errors: string[];
  warnings: string[];
  stats: Record<string, number>;
}

export async function validateMigration(
  dataSource: DataSource,
): Promise<ValidationResult> {
  const result: ValidationResult = {
    passed: true,
    errors: [],
    warnings: [],
    stats: {},
  };

  try {
    // 1. Check all meetings have room_type
    const meetingsWithoutRoomType = await dataSource.query(`
      SELECT COUNT(*) as count 
      FROM meetings 
      WHERE room_type IS NULL OR room_type = ''
    `);

    const count = parseInt(meetingsWithoutRoomType[0]?.count || '0');
    if (count > 0) {
      result.passed = false;
      result.errors.push(`Found ${count} meetings without room_type`);
    }

    // 2. Check room_states populated correctly (if table exists)
    const roomStatesTableExists = await dataSource.query(`
      SELECT COUNT(*) as count
      FROM information_schema.tables
      WHERE table_schema = DATABASE()
      AND table_name = 'room_states'
    `);

    if (parseInt(roomStatesTableExists[0]?.count || '0') > 0) {
      const activeMeetings = await dataSource.query(`
        SELECT COUNT(*) as count 
        FROM meetings 
        WHERE status = 'live' OR status = 'scheduled'
      `);

      const roomStates = await dataSource.query(`
        SELECT COUNT(*) as count 
        FROM room_states
      `);

      result.stats['active_meetings'] = parseInt(activeMeetings[0]?.count || '0');
      result.stats['room_states'] = parseInt(roomStates[0]?.count || '0');

      if (result.stats['room_states'] < result.stats['active_meetings']) {
        result.warnings.push(
          `Room states (${result.stats['room_states']}) less than active meetings (${result.stats['active_meetings']})`,
        );
      }
    }

    // 3. Check feature flags exist
    const featureFlagsTableExists = await dataSource.query(`
      SELECT COUNT(*) as count
      FROM information_schema.tables
      WHERE table_schema = DATABASE()
      AND table_name = 'feature_flags'
    `);

    if (parseInt(featureFlagsTableExists[0]?.count || '0') > 0) {
      const featureFlags = await dataSource.query(`
        SELECT COUNT(*) as count 
        FROM feature_flags
      `);

      result.stats['feature_flags'] = parseInt(featureFlags[0]?.count || '0');

      if (result.stats['feature_flags'] < 4) {
        result.warnings.push('Less than 4 feature flags found');
      }
    } else {
      result.warnings.push('Feature flags table does not exist');
    }

    // 4. Check data integrity - orphaned participants
    const orphanedParticipants = await dataSource.query(`
      SELECT COUNT(*) as count
      FROM meeting_participants mp
      LEFT JOIN meetings m ON mp.meeting_id = m.id
      WHERE m.id IS NULL
    `);

    const orphanedCount = parseInt(orphanedParticipants[0]?.count || '0');
    if (orphanedCount > 0) {
      result.warnings.push(`Found ${orphanedCount} orphaned participants`);
    }

    // 5. Check total meetings
    const totalMeetings = await dataSource.query(`
      SELECT COUNT(*) as count FROM meetings
    `);
    result.stats['total_meetings'] = parseInt(totalMeetings[0]?.count || '0');

    // 6. Check total participants
    const totalParticipants = await dataSource.query(`
      SELECT COUNT(*) as count FROM meeting_participants
    `);
    result.stats['total_participants'] = parseInt(
      totalParticipants[0]?.count || '0',
    );

    // 7. Check room type distribution
    const roomTypeDistribution = await dataSource.query(`
      SELECT room_type, COUNT(*) as count
      FROM meetings
      GROUP BY room_type
    `);
    result.stats['room_type_distribution'] = roomTypeDistribution.reduce(
      (acc, row) => {
        acc[row.room_type] = parseInt(row.count);
        return acc;
      },
      {} as Record<string, number>,
    );
  } catch (error) {
    result.passed = false;
    result.errors.push(`Validation error: ${error.message}`);
  }

  return result;
}

// Run validation if called directly
if (require.main === module) {
  import('../database/data-source').then(async ({ dataSource }) => {
    await dataSource.initialize();

    console.log('Running migration validation...');
    const result = await validateMigration(dataSource);

    console.log('\n=== Validation Results ===');
    console.log(`Status: ${result.passed ? '✅ PASSED' : '❌ FAILED'}`);

    if (result.errors.length > 0) {
      console.log('\n❌ Errors:');
      result.errors.forEach((err) => console.log(`  - ${err}`));
    }

    if (result.warnings.length > 0) {
      console.log('\n⚠️  Warnings:');
      result.warnings.forEach((warn) => console.log(`  - ${warn}`));
    }

    console.log('\n📊 Stats:');
    Object.entries(result.stats).forEach(([key, value]) => {
      if (typeof value === 'object') {
        console.log(`  ${key}:`);
        Object.entries(value).forEach(([k, v]) => {
          console.log(`    ${k}: ${v}`);
        });
      } else {
        console.log(`  ${key}: ${value}`);
      }
    });

    await dataSource.destroy();

    process.exit(result.passed ? 0 : 1);
  });
}

