import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { MetricsService } from './metrics.service';
import { CreateMetricDto } from './dto/create-metric.dto';
import { CreateLiveKitMetricDto } from './dto/livekit-metric.dto';
import { JwtAuthGuard } from '../core/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../core/auth/guards/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../users/user.entity';

@Controller('metrics')
export class MetricsController {
  constructor(private readonly metricsService: MetricsService) {}

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

  @Get('realtime')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async getRealtimeMetrics() {
    return this.metricsService.getRealtimeMetrics();
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