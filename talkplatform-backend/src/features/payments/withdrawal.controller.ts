import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../core/auth/guards/jwt-auth.guard';
import { WithdrawalService } from './withdrawal.service';
import { CreateWithdrawalDto } from './dto/create-withdrawal.dto';

@ApiTags('Withdrawals')
@Controller('withdrawals')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class WithdrawalController {
  constructor(private readonly withdrawalService: WithdrawalService) {}

  @Post('request')
  @ApiOperation({ summary: 'Request withdrawal' })
  async requestWithdrawal(@Request() req: any, @Body() dto: CreateWithdrawalDto) {
    return this.withdrawalService.requestWithdrawal(
      req.user.id,
      dto.amount,
      dto.bank_account_info,
      dto.notes,
    );
  }

  @Get('me')
  @ApiOperation({ summary: 'Get my withdrawals' })
  async getMyWithdrawals(@Request() req: any) {
    return this.withdrawalService.getMyWithdrawals(req.user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get withdrawal by ID' })
  async getWithdrawalById(@Request() req: any, @Param('id') id: string) {
    return this.withdrawalService.getWithdrawalById(id, req.user.id);
  }
}

