import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { MetricsService } from './metrics.service';
import { CreateMetricDto } from './dto/create-metric.dto';
import { JwtAuthGuard } from '../core/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../core/auth/guards/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../users/user.entity';

@Controller('api/metrics')
@UseGuards(JwtAuthGuard, RolesGuard)
export class MetricsController {
  constructor(private readonly metricsService: MetricsService) {}

  @Post()
  @Roles(UserRole.ADMIN)
  async createMetric(@Body() createMetricDto: CreateMetricDto) {
    return this.metricsService.goodInsertMethod(createMetricDto);
  }

  @Post('bulk')
  @Roles(UserRole.ADMIN)
  async createBulkMetrics(@Body() createMetricsDto: CreateMetricDto[]) {
    return this.metricsService.bestBulkInsertMethod(createMetricsDto);
  }

  @Get('hourly')
  @Roles(UserRole.ADMIN)
  async getHourlyMetrics(@Query('hours') hours?: string) {
    const hoursNum = hours ? parseInt(hours, 10) : 24;
    return this.metricsService.getHourlyMetrics(hoursNum);
  }

  @Get('realtime')
  @Roles(UserRole.ADMIN)
  async getRealtimeMetrics() {
    return this.metricsService.getRealtimeMetrics();
  }

  @Get('overview')
  @Roles(UserRole.ADMIN)
  async getSystemOverview() {
    return this.metricsService.getSystemOverview();
  }
}