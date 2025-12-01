# Gradual Rollout Plan - New Gateway Migration

**Ngày tạo:** 2025-12-01  
**Mục đích:** Kế hoạch rollout từng bước cho new gateway migration

---

## 📋 Tổng Quan

Rollout plan để migrate từ old gateway sang new modular gateway một cách an toàn với zero downtime.

---

## 🎯 Objectives

- ✅ Zero downtime migration
- ✅ Ability to rollback quickly
- ✅ Monitor errors and performance
- ✅ Gradual user migration (10% → 50% → 100%)

---

## 📊 Rollout Phases

### Phase 1: Preparation (Days 1-3)

**Tasks:**
- [x] New gateway implemented
- [x] Unit tests written
- [x] Integration tests written
- [ ] Frontend code updated
- [ ] Feature flag created (`use_new_gateway`)
- [ ] Monitoring dashboard ready

**Feature Flag Status:**
```sql
-- Initial state
UPDATE feature_flags 
SET enabled = false, rollout_percentage = 0 
WHERE name = 'use_new_gateway';
```

**Success Criteria:**
- All tests passing
- Frontend can use both old and new events
- Monitoring in place

---

### Phase 2: Internal Testing (Days 4-5)

**Tasks:**
- [ ] Enable for internal team (manual user list)
- [ ] Test all WebRTC flows
- [ ] Test media controls
- [ ] Monitor errors

**Feature Flag Status:**
```typescript
// Manual enable for specific users
await featureFlagService.enableForUsers('use_new_gateway', [
  'internal-user-1',
  'internal-user-2',
]);
```

**Success Criteria:**
- No critical errors
- All features working
- Performance acceptable

---

### Phase 3: Canary Release (Days 6-7)

**Tasks:**
- [ ] Enable for 10% of users
- [ ] Monitor error rates
- [ ] Monitor performance metrics
- [ ] Collect user feedback

**Feature Flag Status:**
```sql
UPDATE feature_flags 
SET enabled = true, rollout_percentage = 10 
WHERE name = 'use_new_gateway';
```

**Monitoring:**
- Error rate < 0.1%
- WebRTC connection success rate > 99%
- Average connection time < 500ms
- No increase in support tickets

**Rollback Plan:**
```sql
-- If issues found, rollback immediately
UPDATE feature_flags 
SET enabled = false, rollout_percentage = 0 
WHERE name = 'use_new_gateway';
```

---

### Phase 4: Gradual Increase (Days 8-10)

**Tasks:**
- [ ] Increase to 25% if no issues
- [ ] Monitor for 24 hours
- [ ] Increase to 50% if stable
- [ ] Monitor for 48 hours

**Feature Flag Status:**
```sql
-- Day 8: 25%
UPDATE feature_flags 
SET rollout_percentage = 25 
WHERE name = 'use_new_gateway';

-- Day 9: 50%
UPDATE feature_flags 
SET rollout_percentage = 50 
WHERE name = 'use_new_gateway';
```

**Success Criteria:**
- Error rate remains low
- No performance degradation
- User satisfaction maintained

---

### Phase 5: Full Rollout (Days 11-12)

**Tasks:**
- [ ] Increase to 100%
- [ ] Monitor for 48 hours
- [ ] Verify all users migrated

**Feature Flag Status:**
```sql
UPDATE feature_flags 
SET enabled = true, rollout_percentage = 100 
WHERE name = 'use_new_gateway';
```

**Success Criteria:**
- 100% traffic on new gateway
- No critical issues
- Performance maintained or improved

---

### Phase 6: Cleanup (Days 13-14)

**Tasks:**
- [ ] Remove old gateway code
- [ ] Remove backward compatibility
- [ ] Update documentation
- [ ] Archive old code

**Cleanup Steps:**
1. Remove `meetings.gateway.ts` file
2. Remove old event handlers
3. Remove feature flag checks
4. Update API documentation

---

## 🔍 Monitoring & Metrics

### Key Metrics to Track

1. **Error Rates**
   - WebRTC connection failures
   - Event handling errors
   - Socket disconnections

2. **Performance Metrics**
   - Average connection time
   - Message delivery latency
   - CPU/Memory usage

3. **User Metrics**
   - Active connections
   - Successful WebRTC connections
   - User satisfaction scores

### Monitoring Dashboard

```typescript
// Example monitoring query
const metrics = {
  errorRate: await getErrorRate('media:offer'),
  connectionTime: await getAverageConnectionTime(),
  activeConnections: await getActiveConnections(),
  successRate: await getWebRTCSuccessRate(),
};
```

---

## 🚨 Rollback Procedure

### Automatic Rollback Triggers

- Error rate > 1%
- Connection success rate < 95%
- Average latency > 1000ms
- Critical bug reported

### Manual Rollback

```bash
# Via API
curl -X POST http://localhost:3000/admin/feature-flags/use_new_gateway/disable

# Via SQL
UPDATE feature_flags 
SET enabled = false, rollout_percentage = 0 
WHERE name = 'use_new_gateway';
```

### Rollback Checklist

- [ ] Disable feature flag
- [ ] Verify old gateway is active
- [ ] Monitor error rates return to normal
- [ ] Investigate root cause
- [ ] Fix issues
- [ ] Retry rollout

---

## 📝 Implementation: Rollout Service

**File:** `src/core/feature-flags/services/rollout.service.ts`

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { FeatureFlagService } from '../feature-flag.service';

@Injectable()
export class RolloutService {
  private readonly logger = new Logger(RolloutService.name);

  constructor(private readonly featureFlagService: FeatureFlagService) {}

  /**
   * Gradual rollout with monitoring
   */
  async gradualRollout(
    flagName: string,
    targetPercentage: number,
    currentPercentage: number,
  ): Promise<void> {
    const steps = this.calculateSteps(currentPercentage, targetPercentage);
    
    for (const step of steps) {
      this.logger.log(`Rolling out ${flagName} to ${step}%`);
      
      await this.featureFlagService.updateRollout(flagName, step);
      
      // Wait and monitor
      await this.waitAndMonitor(flagName, 24 * 60 * 60 * 1000); // 24 hours
      
      // Check if we should continue
      if (!(await this.shouldContinue(flagName))) {
        this.logger.warn(`Rollout paused for ${flagName} due to issues`);
        break;
      }
    }
  }

  private calculateSteps(current: number, target: number): number[] {
    const steps = [];
    let next = current;
    
    while (next < target) {
      if (next === 0) {
        next = 10;
      } else if (next < 50) {
        next = Math.min(next + 25, target);
      } else {
        next = Math.min(next + 50, target);
      }
      steps.push(next);
    }
    
    return steps;
  }

  private async waitAndMonitor(flagName: string, duration: number): Promise<void> {
    // Monitor metrics during rollout
    // This is a placeholder - implement actual monitoring
    await new Promise(resolve => setTimeout(resolve, duration));
  }

  private async shouldContinue(flagName: string): Promise<boolean> {
    // Check error rates, performance, etc.
    // Return false if issues detected
    return true;
  }
}
```

---

## 📊 Rollout Timeline

```
Day 1-3:   Preparation & Testing
Day 4-5:   Internal Testing (manual users)
Day 6-7:   Canary Release (10%)
Day 8:     25% rollout
Day 9-10:  50% rollout
Day 11-12: 100% rollout
Day 13-14: Cleanup
```

---

## ✅ Success Criteria

### Phase Completion Criteria

**Phase 3 (10%):**
- Error rate < 0.1%
- No critical bugs
- Performance maintained

**Phase 4 (50%):**
- Error rate < 0.1%
- User satisfaction maintained
- No support ticket increase

**Phase 5 (100%):**
- All users migrated
- Old gateway can be removed
- Documentation updated

---

## 📚 Related Documents

- Frontend Update Guide: `docs/after_refactor/FRONTEND_UPDATE_GUIDE.md`
- Event Migration Map: `docs/after_refactor/EVENT_MIGRATION_MAP.md`
- Testing Summary: `docs/after_refactor/TASK1_TESTING_SUMMARY.md`

---

**Last Updated:** 2025-12-01

