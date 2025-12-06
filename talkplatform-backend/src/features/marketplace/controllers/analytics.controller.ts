import {
    Controller,
    Get,
    Query,
    UseGuards,
    Param,
} from '@nestjs/common';
import { AnalyticsService } from '../services/analytics.service';
import { JwtAuthGuard } from '../../../auth/jwt-auth.guard';
import { RolesGuard } from '../../../core/auth/guards/roles.guard';
import { Roles } from '../../../auth/roles.decorator';
import { UserRole } from '../../../users/user.entity';
import { Account } from '../../../core/auth/decorators/account.decorator';
import { User } from '../../../users/user.entity';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

@ApiTags('Marketplace Analytics')
@Controller('marketplace/analytics')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.TEACHER)
@ApiBearerAuth()
export class AnalyticsController {
    constructor(private readonly analyticsService: AnalyticsService) {}

    /**
     * GET /marketplace/analytics/revenue
     * Get teacher revenue statistics
     */
    @Get('revenue')
    @ApiOperation({ summary: 'Get teacher revenue statistics' })
    @ApiResponse({ status: 200, description: 'Revenue statistics retrieved successfully' })
    async getRevenueStats(
        @Account() user: User,
        @Query('start_date') startDate?: string,
        @Query('end_date') endDate?: string,
    ) {
        const start = startDate ? new Date(startDate) : undefined;
        const end = endDate ? new Date(endDate) : undefined;

        return this.analyticsService.getTeacherRevenueStats(user.id, start, end);
    }

    /**
     * GET /marketplace/analytics/top-materials
     * Get top selling materials
     */
    @Get('top-materials')
    @ApiOperation({ summary: 'Get top selling materials' })
    @ApiResponse({ status: 200, description: 'Top materials retrieved successfully' })
    async getTopMaterials(
        @Account() user: User,
        @Query('limit') limit?: string,
    ) {
        const limitNum = limit ? parseInt(limit, 10) : 10;
        return this.analyticsService.getTopMaterials(user.id, limitNum);
    }

    /**
     * GET /marketplace/analytics/revenue-chart
     * Get revenue time series for charts
     */
    @Get('revenue-chart')
    @ApiOperation({ summary: 'Get revenue time series for charts' })
    @ApiResponse({ status: 200, description: 'Revenue chart data retrieved successfully' })
    async getRevenueChart(
        @Account() user: User,
        @Query('period') period: 'day' | 'week' | 'month' = 'day',
        @Query('start_date') startDate: string,
        @Query('end_date') endDate: string,
    ) {
        const start = new Date(startDate);
        const end = new Date(endDate);

        return this.analyticsService.getRevenueTimeSeries(
            user.id,
            period,
            start,
            end,
        );
    }

    /**
     * GET /marketplace/analytics/material/:id
     * Get detailed revenue for a specific material
     */
    @Get('material/:id')
    @ApiOperation({ summary: 'Get detailed revenue for a specific material' })
    @ApiResponse({ status: 200, description: 'Material revenue breakdown retrieved successfully' })
    @ApiResponse({ status: 404, description: 'Material not found' })
    async getMaterialRevenue(
        @Account() user: User,
        @Param('id') materialId: string,
    ) {
        return this.analyticsService.getMaterialRevenueBreakdown(
            user.id,
            materialId,
        );
    }
}

