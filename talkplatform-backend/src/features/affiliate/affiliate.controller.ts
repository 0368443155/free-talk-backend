import { Controller, Get, Query, Param, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../core/auth/guards/jwt-auth.guard';
import { AffiliateService } from './affiliate.service';
import { AffiliateStatsDto, ReferralDto, EarningsHistoryDto, ValidateAffiliateCodeDto } from './dto/affiliate-stats.dto';

@ApiTags('Affiliate')
@Controller('affiliate')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
export class AffiliateController {
  constructor(private readonly affiliateService: AffiliateService) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Get affiliate dashboard statistics' })
  @ApiResponse({ status: 200, description: 'Dashboard stats retrieved successfully', type: AffiliateStatsDto })
  async getDashboardStats(@Request() req: any): Promise<AffiliateStatsDto> {
    return this.affiliateService.getStats(req.user.id);
  }

  @Get('referrals')
  @ApiOperation({ summary: 'Get list of referrals' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number (default: 1)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page (default: 20)' })
  @ApiResponse({ status: 200, description: 'Referrals list retrieved successfully' })
  async getReferrals(
    @Request() req: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ): Promise<{ referrals: ReferralDto[]; total: number }> {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 20;
    return this.affiliateService.getReferrals(req.user.id, pageNum, limitNum);
  }

  @Get('earnings-history')
  @ApiOperation({ summary: 'Get earnings history' })
  @ApiQuery({ name: 'period', required: false, enum: ['week', 'month', 'year'], description: 'Time period (default: month)' })
  @ApiResponse({ status: 200, description: 'Earnings history retrieved successfully', type: [EarningsHistoryDto] })
  async getEarningsHistory(
    @Request() req: any,
    @Query('period') period: 'week' | 'month' | 'year' = 'month',
  ): Promise<EarningsHistoryDto[]> {
    return this.affiliateService.getEarningsHistory(req.user.id, period);
  }

  @Get('validate/:code')
  @ApiOperation({ summary: 'Validate affiliate code' })
  @ApiResponse({ status: 200, description: 'Affiliate code validation result', type: ValidateAffiliateCodeDto })
  async validateAffiliateCode(@Param('code') code: string): Promise<ValidateAffiliateCodeDto> {
    return this.affiliateService.validateAffiliateCode(code);
  }
}

