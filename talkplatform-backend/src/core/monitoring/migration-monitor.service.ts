import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { FeatureFlagService } from '../feature-flags/feature-flag.service';

export interface MigrationMetrics {
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
}

@Injectable()
export class MigrationMonitorService {
  private readonly logger = new Logger(MigrationMonitorService.name);
  private metrics: MigrationMetrics = {
    totalConnections: 0,
    oldGatewayConnections: 0,
    newGatewayConnections: 0,
    oldGatewayLatency: 0,
    newGatewayLatency: 0,
    oldGatewayThroughput: 0,
    newGatewayThroughput: 0,
    oldGatewayErrors: 0,
    newGatewayErrors: 0,
    oldGatewayErrorRate: 0,
    newGatewayErrorRate: 0,
    activeRooms: 0,
    messagesPerMinute: 0,
  };

  constructor(private readonly featureFlagService: FeatureFlagService) {}

  /**
   * Check migration health every minute
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async checkMigrationHealth() {
    try {
      const metrics = await this.getMigrationMetrics();

      // Check error rate
      if (metrics.newGatewayErrorRate > 0.05) {
        // 5% error rate
        this.logger.error(
          `⚠️ New gateway error rate exceeded 5%: ${metrics.newGatewayErrorRate}`,
        );
        await this.sendAlert('critical', 'New gateway error rate exceeded 5%', metrics);
      }

      // Check latency
      if (
        metrics.newGatewayLatency > 0 &&
        metrics.oldGatewayLatency > 0 &&
        metrics.newGatewayLatency > metrics.oldGatewayLatency * 2
      ) {
        this.logger.warn(
          `⚠️ New gateway latency is 2x higher than old: ${metrics.newGatewayLatency}ms vs ${metrics.oldGatewayLatency}ms`,
        );
        await this.sendAlert(
          'warning',
          'New gateway latency is 2x higher than old',
          metrics,
        );
      }

      // Log metrics
      this.logger.log(`📊 Migration metrics: ${JSON.stringify(metrics)}`);
    } catch (error) {
      this.logger.error(`Error checking migration health: ${error.message}`);
    }
  }

  /**
   * Get migration metrics
   */
  async getMigrationMetrics(): Promise<MigrationMetrics> {
    // This would typically fetch from metrics service
    // For now, return current metrics
    return this.metrics;
  }

  /**
   * Update metrics
   */
  updateMetrics(metrics: Partial<MigrationMetrics>): void {
    this.metrics = { ...this.metrics, ...metrics };
  }

  /**
   * Record gateway connection
   */
  recordConnection(gateway: 'old' | 'new'): void {
    if (gateway === 'old') {
      this.metrics.oldGatewayConnections++;
    } else {
      this.metrics.newGatewayConnections++;
    }
    this.metrics.totalConnections =
      this.metrics.oldGatewayConnections + this.metrics.newGatewayConnections;
  }

  /**
   * Record gateway error
   */
  recordError(gateway: 'old' | 'new'): void {
    if (gateway === 'old') {
      this.metrics.oldGatewayErrors++;
    } else {
      this.metrics.newGatewayErrors++;
    }

    // Calculate error rates
    if (this.metrics.oldGatewayConnections > 0) {
      this.metrics.oldGatewayErrorRate =
        this.metrics.oldGatewayErrors / this.metrics.oldGatewayConnections;
    }

    if (this.metrics.newGatewayConnections > 0) {
      this.metrics.newGatewayErrorRate =
        this.metrics.newGatewayErrors / this.metrics.newGatewayConnections;
    }
  }

  /**
   * Record gateway latency
   */
  recordLatency(gateway: 'old' | 'new', latency: number): void {
    if (gateway === 'old') {
      this.metrics.oldGatewayLatency = latency;
    } else {
      this.metrics.newGatewayLatency = latency;
    }
  }

  /**
   * Send alert
   */
  private async sendAlert(
    level: 'critical' | 'warning',
    message: string,
    metrics: MigrationMetrics,
  ): Promise<void> {
    // This would typically send to Slack, email, etc.
    this.logger.error(`🚨 [${level.toUpperCase()}] ${message}`, metrics);
  }
}

