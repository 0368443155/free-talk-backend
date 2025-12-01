# 🔄 Phase 6: Migration & Deployment - Chi Tiết Implementation

## 📋 Mục Lục
1. [Tổng Quan](#tổng-quan)
2. [Data Migration Strategy](#data-migration-strategy)
3. [Parallel Running](#parallel-running)
4. [Gradual Rollout](#gradual-rollout)
5. [Monitoring & Rollback](#monitoring--rollback)
6. [Cleanup](#cleanup)

---

## 🎯 Tổng Quan

### Mục Tiêu Phase 6

**Timeline:** Week 11-12 (14 ngày)

**Objectives:**
1. ✅ Migrate existing data to new structure
2. ✅ Run old and new code in parallel
3. ✅ Gradual traffic shift (10% → 50% → 100%)
4. ✅ Zero downtime deployment
5. ✅ Rollback plan ready
6. ✅ Remove old code after successful migration

### Critical Success Factors

- ✅ **Zero Data Loss**: All existing data must be preserved
- ✅ **Zero Downtime**: Users should not experience any interruption
- ✅ **Backward Compatibility**: Old clients must continue to work
- ✅ **Easy Rollback**: Ability to revert in < 5 minutes
- ✅ **Comprehensive Monitoring**: Real-time metrics and alerts

---

## 🗄️ Data Migration Strategy

### Phase 6.1: Analyze Existing Data

#### Step 1: Inventory Current Data

```sql
-- Count existing meetings
SELECT 
  meeting_type,
  COUNT(*) as total,
  SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active,
  SUM(CASE WHEN status = 'ended' THEN 1 ELSE 0 END) as ended
FROM meetings
GROUP BY meeting_type;

-- Count participants
SELECT 
  COUNT(*) as total_participants,
  COUNT(DISTINCT user_id) as unique_users
FROM meeting_participants;

-- Count chat messages
SELECT 
  COUNT(*) as total_messages,
  AVG(LENGTH(message)) as avg_message_length
FROM meeting_chat_messages;
```

#### Step 2: Identify Data Gaps

```typescript
// Check for data inconsistencies
interface DataGap {
  type: string;
  count: number;
  examples: string[];
}

async function analyzeDataGaps(): Promise<DataGap[]> {
  const gaps: DataGap[] = [];

  // Check for meetings without room type
  const meetingsWithoutType = await db.query(`
    SELECT id FROM meetings WHERE meeting_type IS NULL
  `);
  
  if (meetingsWithoutType.length > 0) {
    gaps.push({
      type: 'meetings_without_type',
      count: meetingsWithoutType.length,
      examples: meetingsWithoutType.slice(0, 5).map(m => m.id),
    });
  }

  // Check for orphaned participants
  const orphanedParticipants = await db.query(`
    SELECT mp.id 
    FROM meeting_participants mp
    LEFT JOIN meetings m ON mp.meeting_id = m.id
    WHERE m.id IS NULL
  `);

  if (orphanedParticipants.length > 0) {
    gaps.push({
      type: 'orphaned_participants',
      count: orphanedParticipants.length,
      examples: orphanedParticipants.slice(0, 5).map(p => p.id),
    });
  }

  return gaps;
}
```

---

### Phase 6.2: Create Migration Scripts

#### Migration Script 1: Room Type Mapping

**File:** `migrations/001-map-meeting-types-to-room-types.ts`

```typescript
import { MigrationInterface, QueryRunner } from 'typeorm';

export class MapMeetingTypesToRoomTypes1701234567890 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add new column for room_type
    await queryRunner.query(`
      ALTER TABLE meetings 
      ADD COLUMN room_type VARCHAR(50) NULL
    `);

    // Map existing meeting types to room types
    await queryRunner.query(`
      UPDATE meetings 
      SET room_type = CASE
        WHEN meeting_type = 'free_talk' THEN 'free_talk'
        WHEN meeting_type = 'lesson' THEN 'lesson'
        WHEN meeting_type = 'teacher_class' THEN 'teacher_class'
        WHEN meeting_type = 'public' THEN 'free_talk'
        WHEN meeting_type = 'private' THEN 'lesson'
        ELSE 'free_talk'
      END
    `);

    // Make room_type NOT NULL after populating
    await queryRunner.query(`
      ALTER TABLE meetings 
      ALTER COLUMN room_type SET NOT NULL
    `);

    // Add index
    await queryRunner.query(`
      CREATE INDEX idx_meetings_room_type ON meetings(room_type)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX idx_meetings_room_type`);
    await queryRunner.query(`ALTER TABLE meetings DROP COLUMN room_type`);
  }
}
```

#### Migration Script 2: Room State Cache

**File:** `migrations/002-create-room-state-cache.ts`

```typescript
import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateRoomStateCache1701234567891 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create room_states table for caching
    await queryRunner.query(`
      CREATE TABLE room_states (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        room_id VARCHAR(255) NOT NULL UNIQUE,
        room_type VARCHAR(50) NOT NULL,
        status VARCHAR(50) NOT NULL,
        host_id UUID NOT NULL,
        participants JSONB DEFAULT '[]',
        features JSONB DEFAULT '{}',
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        expires_at TIMESTAMP NOT NULL
      )
    `);

    // Add indexes
    await queryRunner.query(`
      CREATE INDEX idx_room_states_room_id ON room_states(room_id)
    `);
    await queryRunner.query(`
      CREATE INDEX idx_room_states_status ON room_states(status)
    `);
    await queryRunner.query(`
      CREATE INDEX idx_room_states_expires_at ON room_states(expires_at)
    `);

    // Populate from existing meetings
    await queryRunner.query(`
      INSERT INTO room_states (room_id, room_type, status, host_id, expires_at)
      SELECT 
        id as room_id,
        room_type,
        status,
        host_id,
        CURRENT_TIMESTAMP + INTERVAL '24 hours' as expires_at
      FROM meetings
      WHERE status = 'active'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE room_states`);
  }
}
```

#### Migration Script 3: Feature Flags

**File:** `migrations/003-add-feature-flags.ts`

```typescript
import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddFeatureFlags1701234567892 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create feature_flags table
    await queryRunner.query(`
      CREATE TABLE feature_flags (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name VARCHAR(100) NOT NULL UNIQUE,
        enabled BOOLEAN DEFAULT false,
        rollout_percentage INTEGER DEFAULT 0,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Insert default feature flags
    await queryRunner.query(`
      INSERT INTO feature_flags (name, enabled, rollout_percentage, description)
      VALUES 
        ('use_new_gateway', false, 0, 'Use new modular gateway instead of monolithic'),
        ('use_room_factory', false, 0, 'Use room factory for creating rooms'),
        ('use_feature_modules', false, 0, 'Use feature modules (chat, media, etc)'),
        ('use_access_control', false, 0, 'Use new access control system')
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE feature_flags`);
  }
}
```

---

### Phase 6.3: Data Validation

#### Validation Script

**File:** `scripts/validate-migration.ts`

```typescript
import { DataSource } from 'typeorm';

interface ValidationResult {
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

  // 1. Check all meetings have room_type
  const meetingsWithoutRoomType = await dataSource.query(`
    SELECT COUNT(*) as count 
    FROM meetings 
    WHERE room_type IS NULL
  `);

  if (meetingsWithoutRoomType[0].count > 0) {
    result.passed = false;
    result.errors.push(
      `Found ${meetingsWithoutRoomType[0].count} meetings without room_type`,
    );
  }

  // 2. Check room_states populated correctly
  const activeMeetings = await dataSource.query(`
    SELECT COUNT(*) as count 
    FROM meetings 
    WHERE status = 'active'
  `);

  const roomStates = await dataSource.query(`
    SELECT COUNT(*) as count 
    FROM room_states
  `);

  result.stats['active_meetings'] = activeMeetings[0].count;
  result.stats['room_states'] = roomStates[0].count;

  if (roomStates[0].count < activeMeetings[0].count) {
    result.warnings.push(
      `Room states (${roomStates[0].count}) less than active meetings (${activeMeetings[0].count})`,
    );
  }

  // 3. Check feature flags exist
  const featureFlags = await dataSource.query(`
    SELECT COUNT(*) as count 
    FROM feature_flags
  `);

  if (featureFlags[0].count < 4) {
    result.passed = false;
    result.errors.push('Missing feature flags');
  }

  // 4. Check data integrity
  const orphanedParticipants = await dataSource.query(`
    SELECT COUNT(*) as count
    FROM meeting_participants mp
    LEFT JOIN meetings m ON mp.meeting_id = m.id
    WHERE m.id IS NULL
  `);

  if (orphanedParticipants[0].count > 0) {
    result.warnings.push(
      `Found ${orphanedParticipants[0].count} orphaned participants`,
    );
  }

  return result;
}

// Run validation
async function main() {
  const dataSource = new DataSource({
    // ... connection config
  });

  await dataSource.initialize();

  console.log('Running migration validation...');
  const result = await validateMigration(dataSource);

  console.log('\n=== Validation Results ===');
  console.log(`Status: ${result.passed ? '✅ PASSED' : '❌ FAILED'}`);
  
  if (result.errors.length > 0) {
    console.log('\n❌ Errors:');
    result.errors.forEach(err => console.log(`  - ${err}`));
  }

  if (result.warnings.length > 0) {
    console.log('\n⚠️  Warnings:');
    result.warnings.forEach(warn => console.log(`  - ${warn}`));
  }

  console.log('\n📊 Stats:');
  Object.entries(result.stats).forEach(([key, value]) => {
    console.log(`  ${key}: ${value}`);
  });

  await dataSource.destroy();

  process.exit(result.passed ? 0 : 1);
}

main();
```

---

## 🔀 Parallel Running

### Phase 6.4: Feature Flag System

#### Feature Flag Service

**File:** `src/core/feature-flags/feature-flag.service.ts`

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FeatureFlag } from './entities/feature-flag.entity';
import { Cache } from 'cache-manager';
import { Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';

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

    // Cache for 1 minute
    await this.cacheManager.set(cacheKey, flag.enabled, 60000);

    return flag.enabled;
  }

  /**
   * Check if user is in rollout percentage
   */
  async isEnabledForUser(flagName: string, userId: string): Promise<boolean> {
    const flag = await this.featureFlagRepository.findOne({
      where: { name: flagName },
    });

    if (!flag || !flag.enabled) {
      return false;
    }

    // If 100% rollout, return true
    if (flag.rolloutPercentage >= 100) {
      return true;
    }

    // Use consistent hashing to determine if user is in rollout
    const hash = this.hashUserId(userId);
    const userPercentage = hash % 100;

    return userPercentage < flag.rolloutPercentage;
  }

  /**
   * Enable a feature flag
   */
  async enable(flagName: string, rolloutPercentage: number = 100): Promise<void> {
    await this.featureFlagRepository.update(
      { name: flagName },
      { 
        enabled: true,
        rolloutPercentage,
        updatedAt: new Date(),
      },
    );

    // Clear cache
    await this.cacheManager.del(`feature_flag:${flagName}`);

    this.logger.log(`Feature flag enabled: ${flagName} (${rolloutPercentage}%)`);
  }

  /**
   * Disable a feature flag
   */
  async disable(flagName: string): Promise<void> {
    await this.featureFlagRepository.update(
      { name: flagName },
      { 
        enabled: false,
        rolloutPercentage: 0,
        updatedAt: new Date(),
      },
    );

    // Clear cache
    await this.cacheManager.del(`feature_flag:${flagName}`);

    this.logger.log(`Feature flag disabled: ${flagName}`);
  }

  /**
   * Hash user ID for consistent rollout
   */
  private hashUserId(userId: string): number {
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      const char = userId.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash);
  }
}
```

#### Dual Gateway Provider

**File:** `src/app.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { MeetingsGateway } from './features/meeting/meetings.gateway';
import { UnifiedRoomGateway } from './features/room-gateway/unified-room.gateway';
import { FeatureFlagService } from './core/feature-flags/feature-flag.service';

@Module({
  providers: [
    // Provide both gateways
    MeetingsGateway,
    UnifiedRoomGateway,
    
    // Factory to choose gateway based on feature flag
    {
      provide: 'ACTIVE_GATEWAY',
      useFactory: async (
        featureFlagService: FeatureFlagService,
        oldGateway: MeetingsGateway,
        newGateway: UnifiedRoomGateway,
      ) => {
        const useNewGateway = await featureFlagService.isEnabled('use_new_gateway');
        return useNewGateway ? newGateway : oldGateway;
      },
      inject: [FeatureFlagService, MeetingsGateway, UnifiedRoomGateway],
    },
  ],
})
export class AppModule {}
```

---

## 📈 Gradual Rollout

### Phase 6.5: Traffic Shifting

#### Week 11: 10% Rollout

```bash
# Enable new gateway for 10% of users
curl -X POST http://localhost:3000/api/admin/feature-flags/use_new_gateway \
  -H "Content-Type: application/json" \
  -d '{
    "enabled": true,
    "rolloutPercentage": 10
  }'
```

**Monitoring:**
```typescript
// Monitor metrics for both gateways
interface GatewayMetrics {
  gateway: 'old' | 'new';
  connections: number;
  messagesPerSecond: number;
  averageLatency: number;
  errorRate: number;
}

async function compareGateways(): Promise<void> {
  const oldMetrics = await getMetrics('old');
  const newMetrics = await getMetrics('new');

  console.log('Old Gateway:', oldMetrics);
  console.log('New Gateway:', newMetrics);

  // Alert if new gateway has higher error rate
  if (newMetrics.errorRate > oldMetrics.errorRate * 1.5) {
    await sendAlert('New gateway error rate is 50% higher than old');
  }

  // Alert if new gateway has higher latency
  if (newMetrics.averageLatency > oldMetrics.averageLatency * 1.5) {
    await sendAlert('New gateway latency is 50% higher than old');
  }
}
```

#### Week 11 Mid: 50% Rollout

```bash
# Increase to 50% if 10% is stable
curl -X POST http://localhost:3000/api/admin/feature-flags/use_new_gateway \
  -H "Content-Type: application/json" \
  -d '{
    "enabled": true,
    "rolloutPercentage": 50
  }'
```

#### Week 12: 100% Rollout

```bash
# Full rollout if 50% is stable
curl -X POST http://localhost:3000/api/admin/feature-flags/use_new_gateway \
  -H "Content-Type: application/json" \
  -d '{
    "enabled": true,
    "rolloutPercentage": 100
  }'
```

---

## 📊 Monitoring & Rollback

### Phase 6.6: Monitoring Dashboard

#### Metrics to Track

```typescript
interface MigrationMetrics {
  // Traffic metrics
  totalConnections: number;
  oldGatewayConnections: number;
  newGatewayConnections: number;
  
  // Performance metrics
  oldGatewayLatency: number;
  newGatewayLatency: number;
  oldGatewayThroughput: number;
  newGatewayThroughput: number;
  
  // Error metrics
  oldGatewayErrors: number;
  newGatewayErrors: number;
  oldGatewayErrorRate: number;
  newGatewayErrorRate: number;
  
  // Business metrics
  activeRooms: number;
  messagesPerMinute: number;
  userSatisfaction: number;
}
```

#### Monitoring Service

**File:** `src/core/monitoring/migration-monitor.service.ts`

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { MetricsService } from './metrics.service';
import { AlertService } from './alert.service';

@Injectable()
export class MigrationMonitorService {
  private readonly logger = new Logger(MigrationMonitorService.name);

  constructor(
    private readonly metricsService: MetricsService,
    private readonly alertService: AlertService,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async checkMigrationHealth() {
    const metrics = await this.metricsService.getMigrationMetrics();

    // Check error rate
    if (metrics.newGatewayErrorRate > 0.05) { // 5% error rate
      await this.alertService.sendCritical(
        'New gateway error rate exceeded 5%',
        metrics,
      );
    }

    // Check latency
    if (metrics.newGatewayLatency > metrics.oldGatewayLatency * 2) {
      await this.alertService.sendWarning(
        'New gateway latency is 2x higher than old',
        metrics,
      );
    }

    // Log metrics
    this.logger.log(`Migration metrics: ${JSON.stringify(metrics)}`);
  }
}
```

### Phase 6.7: Rollback Plan

#### Automated Rollback

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { FeatureFlagService } from '../feature-flags/feature-flag.service';
import { MetricsService } from './metrics.service';

@Injectable()
export class AutoRollbackService {
  private readonly logger = new Logger(AutoRollbackService.name);

  constructor(
    private readonly featureFlagService: FeatureFlagService,
    private readonly metricsService: MetricsService,
  ) {}

  async checkAndRollback(): Promise<void> {
    const metrics = await this.metricsService.getMigrationMetrics();

    // Rollback conditions
    const shouldRollback = 
      metrics.newGatewayErrorRate > 0.10 || // 10% error rate
      metrics.newGatewayLatency > 5000 || // 5 second latency
      metrics.newGatewayConnections === 0; // No connections

    if (shouldRollback) {
      this.logger.error('Auto-rollback triggered!');
      
      // Disable new gateway
      await this.featureFlagService.disable('use_new_gateway');
      
      // Send alert
      await this.sendRollbackAlert(metrics);
      
      this.logger.log('Rollback completed');
    }
  }

  private async sendRollbackAlert(metrics: any): Promise<void> {
    // Send to Slack, email, etc.
    console.log('ROLLBACK ALERT:', metrics);
  }
}
```

#### Manual Rollback Script

```bash
#!/bin/bash
# rollback.sh - Emergency rollback script

echo "🚨 EMERGENCY ROLLBACK INITIATED"

# Disable new gateway
curl -X POST http://localhost:3000/api/admin/feature-flags/use_new_gateway \
  -H "Content-Type: application/json" \
  -d '{"enabled": false, "rolloutPercentage": 0}'

echo "✅ New gateway disabled"

# Verify old gateway is active
curl http://localhost:3000/api/health

echo "✅ Rollback completed"
```

---

## 🧹 Cleanup

### Phase 6.8: Remove Old Code

#### After 2 Weeks of Stable 100% Rollout

```bash
# 1. Remove old gateway
rm -rf src/features/meeting/meetings.gateway.ts
rm -rf src/features/meeting/enhanced-meetings.gateway.ts

# 2. Remove old services
rm -rf src/features/meeting/meetings.service.ts

# 3. Update imports
# ... update all files that imported old gateway

# 4. Remove feature flags
npm run migration:run -- RemoveFeatureFlags

# 5. Clean up database
npm run migration:run -- CleanupOldTables
```

#### Cleanup Migration

**File:** `migrations/004-cleanup-old-tables.ts`

```typescript
import { MigrationInterface, QueryRunner } from 'typeorm';

export class CleanupOldTables1701234567893 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Archive old data before dropping
    await queryRunner.query(`
      CREATE TABLE meetings_archive AS 
      SELECT * FROM meetings
    `);

    // Drop old columns that are no longer needed
    await queryRunner.query(`
      ALTER TABLE meetings 
      DROP COLUMN IF EXISTS old_meeting_type
    `);

    // Drop feature flags table (no longer needed)
    await queryRunner.query(`
      DROP TABLE IF EXISTS feature_flags
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Restore from archive if needed
    await queryRunner.query(`
      INSERT INTO meetings 
      SELECT * FROM meetings_archive
    `);
  }
}
```

---

## 📊 Success Criteria

### Migration Checklist

- [ ] All migrations run successfully
- [ ] Data validation passed
- [ ] Feature flags working
- [ ] 10% rollout stable for 2 days
- [ ] 50% rollout stable for 3 days
- [ ] 100% rollout stable for 7 days
- [ ] No increase in error rate
- [ ] No increase in latency
- [ ] User satisfaction maintained
- [ ] Old code removed
- [ ] Documentation updated

### Metrics Targets

| Metric | Target | Actual |
|--------|--------|--------|
| Error Rate | < 1% | __ |
| Latency (p95) | < 500ms | __ |
| Uptime | > 99.9% | __ |
| Data Loss | 0 | __ |
| User Complaints | < 5 | __ |

---

**Status:** 🔴 Not Started  
**Timeline:** Week 11-12  
**Priority:** Critical  
**Risk:** Very High (Production migration)
