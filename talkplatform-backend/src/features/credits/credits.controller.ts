import { Controller, Get, Post, Body, Param, Query, UseGuards, Request, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../core/auth/guards/jwt-auth.guard';
import { CreditsService } from './credits.service';
import { PurchaseCreditsDto, DonateCreditsDto } from './dto/credits.dto';
import { PaginationDto } from '../../core/common/dto/pagination.dto';

@ApiTags('Credits & Payments')
@Controller('credits')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
export class CreditsController {
  private readonly logger = new Logger(CreditsController.name);

  constructor(private readonly creditsService: CreditsService) {}

  @Get('balance')
  @ApiOperation({ summary: 'Get user credit balance and recent transactions' })
  @ApiResponse({ status: 200, description: 'Credit balance retrieved successfully' })
  async getCreditBalance(@Request() req: any) {
    return this.creditsService.getCreditBalance(req.user.id);
  }

  @Get('packages')
  @ApiOperation({ summary: 'Get available credit packages for purchase' })
  @ApiResponse({ status: 200, description: 'Credit packages retrieved successfully' })
  async getCreditPackages() {
    return this.creditsService.getCreditPackages();
  }

  @Post('purchase')
  @ApiOperation({ summary: 'Purchase credits via payment provider' })
  @ApiResponse({ status: 201, description: 'Credit purchase initiated successfully' })
  async purchaseCredits(
    @Body() purchaseDto: PurchaseCreditsDto,
    @Request() req: any
  ) {
    return this.creditsService.initiateCreditPurchase(purchaseDto, req.user);
  }

  @Post('purchase/confirm/:transactionId')
  @ApiOperation({ summary: 'Confirm credit purchase after payment' })
  @ApiResponse({ status: 200, description: 'Credit purchase confirmed successfully' })
  async confirmPurchase(
    @Param('transactionId') transactionId: string,
    @Request() req: any
  ) {
    return this.creditsService.confirmCreditPurchase(transactionId, req.user);
  }

  @Get('transactions')
  @ApiOperation({ summary: 'Get user transaction history' })
  @ApiResponse({ status: 200, description: 'Transaction history retrieved successfully' })
  async getTransactionHistory(
    @Query() paginationDto: PaginationDto,
    @Query('type') type?: string,
    @Query('status') status?: string,
    @Request() req?: any
  ) {
    const filters = {
      transaction_type: type || undefined,
      status: status || undefined
    };

    return this.creditsService.getTransactionHistory(req.user.id, paginationDto, filters);
  }

  @Post('donate/:teacherId')
  @ApiOperation({ summary: 'Donate credits to a teacher' })
  @ApiResponse({ status: 200, description: 'Credits donated successfully' })
  async donateCredits(
    @Param('teacherId') teacherId: string,
    @Body() donateDto: DonateCreditsDto,
    @Request() req: any
  ) {
    return this.creditsService.donateCredits(req.user, teacherId, donateDto);
  }

  @Get('earnings')
  @ApiOperation({ summary: 'Get teacher earnings and revenue share breakdown' })
  @ApiResponse({ status: 200, description: 'Earnings retrieved successfully' })
  async getEarnings(
    @Query() paginationDto: PaginationDto,
    @Query('period') period?: string, // 'week', 'month', 'year'
    @Request() req?: any
  ) {
    return this.creditsService.getTeacherEarnings(req.user.id, paginationDto, period);
  }

  @Post('withdraw')
  @ApiOperation({ summary: 'Request withdrawal of teacher earnings' })
  @ApiResponse({ status: 200, description: 'Withdrawal request submitted' })
  async requestWithdrawal(
    @Body() withdrawalDto: { amount: number; payment_method: string; payment_details: any },
    @Request() req: any
  ) {
    return this.creditsService.requestWithdrawal(req.user, withdrawalDto);
  }

  @Get('affiliate/stats')
  @ApiOperation({ summary: 'Get affiliate program statistics' })
  @ApiResponse({ status: 200, description: 'Affiliate stats retrieved successfully' })
  async getAffiliateStats(@Request() req: any) {
    return this.creditsService.getAffiliateStats(req.user.id);
  }

  @Get('revenue-share/:meetingId')
  @ApiOperation({ summary: 'Get revenue share breakdown for a specific meeting' })
  @ApiResponse({ status: 200, description: 'Revenue share breakdown retrieved' })
  async getRevenueShareBreakdown(
    @Param('meetingId') meetingId: string,
    @Request() req: any
  ) {
    return this.creditsService.getRevenueShareBreakdown(meetingId, req.user);
  }

  // Admin endpoints
  @Post('admin/adjust/:userId')
  @ApiOperation({ summary: 'Admin: Manually adjust user credits' })
  async adminAdjustCredits(
    @Param('userId') userId: string,
    @Body() adjustmentDto: { amount: number; reason: string },
    @Request() req: any
  ) {
    // TODO: Add admin guard
    return this.creditsService.adminAdjustCredits(userId, adjustmentDto, req.user);
  }

  @Get('admin/transactions')
  @ApiOperation({ summary: 'Admin: Get all transactions' })
  async adminGetAllTransactions(
    @Query() paginationDto: PaginationDto,
    @Query('user_id') userId?: string,
    @Query('type') type?: string,
    @Query('status') status?: string
  ) {
    // TODO: Add admin guard
    const filters = { user_id: userId, transaction_type: type, status };
    return this.creditsService.getAllTransactions(paginationDto, filters);
  }

  @Get('admin/revenue-summary')
  @ApiOperation({ summary: 'Admin: Get platform revenue summary' })
  async adminGetRevenueSummary(
    @Query('start_date') startDate?: string,
    @Query('end_date') endDate?: string
  ) {
    // TODO: Add admin guard
    return this.creditsService.getPlatformRevenueSummary(startDate, endDate);
  }
}