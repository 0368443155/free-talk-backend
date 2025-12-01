import {
  Controller,
  Get,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../core/auth/guards/jwt-auth.guard';
import { RevenueService } from './revenue.service';

@ApiTags('Revenue')
@Controller('revenue')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class RevenueController {
  constructor(private readonly revenueService: RevenueService) {}

  @Get('teacher/summary')
  @ApiOperation({ summary: 'Get teacher revenue summary' })
  async getTeacherRevenue(@Request() req: any) {
    return this.revenueService.getTeacherRevenue(req.user.id);
  }

  @Get('teacher/transactions')
  @ApiOperation({ summary: 'Get teacher transaction history' })
  async getTransactionHistory(
    @Request() req: any,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    return this.revenueService.getTransactionHistory(
      req.user.id,
      limit ? parseInt(limit.toString(), 10) : 50,
      offset ? parseInt(offset.toString(), 10) : 0,
    );
  }

  @Get('teacher/withdrawals')
  @ApiOperation({ summary: 'Get teacher withdrawal history' })
  async getWithdrawalHistory(@Request() req: any) {
    return this.revenueService.getWithdrawalHistory(req.user.id);
  }
}

