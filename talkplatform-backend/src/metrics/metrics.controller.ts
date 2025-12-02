import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { InjectRedis } from '@nestjs-modules/ioredis';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThanOrEqual } from 'typeorm';
import Redis from 'ioredis';
import { MetricsService } from './metrics.service';
import { CreateMetricDto } from './dto/create-metric.dto';
import { CreateLiveKitMetricDto } from './dto/livekit-metric.dto';
import { JwtAuthGuard } from '../core/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../core/auth/guards/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../users/user.entity';
import { MetricsHourly } from './entities/metrics-hourly.entity';
import { MetricsCollector } from './services/metrics-collector.service';

@Controller('metrics')
export class MetricsController {
  constructor(
    private readonly metricsService: MetricsService,
    @InjectRedis() private readonly redis: Redis,
    @InjectRepository(MetricsHourly)
    private readonly metricsRepo: Repository<MetricsHourly>,
    private readonly metricsCollector: MetricsCollector,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async createMetric(@Body() createMetricDto: CreateMetricDto) {
    return this.metricsService.goodInsertMethod(createMetricDto);
  }

  @Post('bulk')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async createBulkMetrics(@Body() createMetricsDto: CreateMetricDto[]) {
    return this.metricsService.bestBulkInsertMethod(createMetricsDto);
  }

  @Get('hourly')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async getHourlyMetrics(@Query('hours') hours?: string) {
    const hoursNum = hours ? parseInt(hours, 10) : 24;
    return this.metricsService.getHourlyMetrics(hoursNum);
  }

  /**
   * Get real-time metrics (last 5 minutes from Redis)
   */
  @Get('realtime')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async getRealtimeMetrics() {
    const keys = await this.redis.keys('metrics:realtime:*');
    const metrics: Array<{
      endpoint: string;
      method: string;
      totalRequests: number;
      totalInbound: number;
      totalOutbound: number;
      avgResponseTime: number;
      maxResponseTime: number;
      errorCount: number;
    }> = [];
    
    for (const key of keys) {
      const data = await this.redis.hgetall(key);
      const parts = key.split(':');
      const endpoint = parts[2];
      const method = parts[3];
      
      metrics.push({
        endpoint,
        method,
        totalRequests: parseInt(data.totalRequests || '0', 10),
        totalInbound: parseInt(data.totalInbound || '0', 10),
        totalOutbound: parseInt(data.totalOutbound || '0', 10),
        avgResponseTime: parseFloat(data.avgResponseTime || '0'),
        maxResponseTime: parseInt(data.maxResponseTime || '0', 10),
        errorCount: parseInt(data.errorCount || '0', 10),
      });
    }
    
    return {
      endpoints: metrics,
      summary: this.calculateSummary(metrics),
    };
  }

  /**
   * Get hourly aggregates (last N hours from MySQL)
   */
  @Get('hourly-new')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async getHourlyNew(@Query('hours') hours: number = 24) {
    const since = new Date();
    since.setHours(since.getHours() - hours);
    
    return this.metricsRepo.find({
      where: {
        hour_start: MoreThanOrEqual(since),
      },
      order: {
        hour_start: 'DESC',
      },
    });
  }

  /**
   * Get buffer status (for monitoring)
   */
  @Get('status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async getStatus() {
    const bufferSize = await this.metricsCollector.getBufferSize();
    const lastPersist = await this.redis.get('metrics:last_persist');
    
    return {
      bufferSize,
      lastPersist: lastPersist ? new Date(parseInt(lastPersist)) : null,
      status: bufferSize < 5000 ? 'healthy' : 'warning',
    };
  }

  private calculateSummary(metrics: any[]) {
    return {
      totalBandwidth: metrics.reduce((sum, m) => sum + m.totalInbound + m.totalOutbound, 0),
      totalRequests: metrics.reduce((sum, m) => sum + m.totalRequests, 0),
      avgResponseTime: metrics.length > 0
        ? metrics.reduce((sum, m) => sum + m.avgResponseTime, 0) / metrics.length
        : 0,
    };
  }

  // Public endpoint for server-side rendering
  @Get('public/hourly')
  async getPublicHourlyMetrics(@Query('hours') hours?: string) {
    const hoursNum = hours ? parseInt(hours, 10) : 24;
    return this.metricsService.getHourlyMetrics(hoursNum);
  }

  @Get('overview')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async getSystemOverview() {
    return this.metricsService.getSystemOverview();
  }

  @Post('livekit')
  async createLiveKitMetric(@Body() createLiveKitMetricDto: CreateLiveKitMetricDto) {
    return this.metricsService.createLiveKitMetric(createLiveKitMetricDto);
  }

  @Post('livekit/bulk')
  async createBulkLiveKitMetrics(@Body() createLiveKitMetricsDto: CreateLiveKitMetricDto[]) {
    return this.metricsService.bulkCreateLiveKitMetrics(createLiveKitMetricsDto);
  }

  @Get('livekit/dashboard')
  async getLiveKitDashboardMetrics(@Query('meetingId') meetingId?: string) {
    return this.metricsService.getLiveKitDashboardMetrics(meetingId);
  }
}