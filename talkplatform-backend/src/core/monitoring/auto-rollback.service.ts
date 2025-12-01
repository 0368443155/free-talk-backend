import { Injectable, Logger } from '@nestjs/common';
import { FeatureFlagService } from '../feature-flags/feature-flag.service';
import { MigrationMonitorService } from './migration-monitor.service';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class AutoRollbackService {
  private readonly logger = new Logger(AutoRollbackService.name);
  private rollbackTriggered = false;

  constructor(
    private readonly featureFlagService: FeatureFlagService,
    private readonly migrationMonitor: MigrationMonitorService,
  ) {}

  /**
   * Check and rollback if needed
   */
  @Cron(CronExpression.EVERY_30_SECONDS)
  async checkAndRollback(): Promise<void> {
    if (this.rollbackTriggered) {
      return; // Already rolled back
    }

    try {
      const metrics = await this.migrationMonitor.getMigrationMetrics();

      // Rollback conditions
      const shouldRollback =
        metrics.newGatewayErrorRate > 0.1 || // 10% error rate
        (metrics.newGatewayLatency > 5000 && metrics.newGatewayLatency > 0) || // 5 second latency
        metrics.newGatewayConnections === 0; // No connections

      if (shouldRollback) {
        this.logger.error('🚨 Auto-rollback triggered!');
        this.logger.error(`Error rate: ${metrics.newGatewayErrorRate}`);
        this.logger.error(`Latency: ${metrics.newGatewayLatency}ms`);
        this.logger.error(`Connections: ${metrics.newGatewayConnections}`);

        // Disable new gateway
        await this.featureFlagService.disable('use_new_gateway');

        // Send alert
        await this.sendRollbackAlert(metrics);

        this.rollbackTriggered = true;
        this.logger.log('✅ Rollback completed - New gateway disabled');
      }
    } catch (error) {
      this.logger.error(`Error in auto-rollback check: ${error.message}`);
    }
  }

  /**
   * Manual rollback
   */
  async manualRollback(): Promise<void> {
    this.logger.warn('🔄 Manual rollback initiated');

    try {
      await this.featureFlagService.disable('use_new_gateway');

      const metrics = await this.migrationMonitor.getMigrationMetrics();
      await this.sendRollbackAlert(metrics);

      this.rollbackTriggered = true;
      this.logger.log('✅ Manual rollback completed');
    } catch (error) {
      this.logger.error(`Manual rollback failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Reset rollback flag (for testing)
   */
  resetRollbackFlag(): void {
    this.rollbackTriggered = false;
  }

  /**
   * Send rollback alert
   */
  private async sendRollbackAlert(metrics: any): Promise<void> {
    // This would typically send to Slack, email, etc.
    this.logger.error('🚨 ROLLBACK ALERT:', {
      timestamp: new Date().toISOString(),
      metrics,
    });
  }
}

