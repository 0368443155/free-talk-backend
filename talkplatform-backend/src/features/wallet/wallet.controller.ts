import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { WalletService } from './wallet.service';

@Controller('api/v1/wallet')
@UseGuards(JwtAuthGuard)
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  /**
   * Lấy số dư hiện tại
   * GET /api/v1/wallet/balance
   */
  @Get('balance')
  async getBalance(@Request() req) {
    const balance = await this.walletService.getUserBalance(req.user.id);
    return { balance, account_id: `user-${req.user.id}` };
  }

  /**
   * Lấy lịch sử giao dịch
   * GET /api/v1/wallet/history
   */
  @Get('history')
  async getHistory(
    @Request() req,
    @Query('limit') limit: string = '50',
    @Query('offset') offset: string = '0',
  ) {
    const accountId = `user-${req.user.id}`;
    return await this.walletService.getAccountHistory(
      accountId,
      parseInt(limit),
      parseInt(offset),
    );
  }

  /**
   * Lấy số dư của một account (admin only)
   * GET /api/v1/wallet/account/:accountId/balance
   */
  @Get('account/:accountId/balance')
  async getAccountBalance(@Param('accountId') accountId: string) {
    const balance = await this.walletService.getAccountBalance(accountId);
    return { account_id: accountId, balance };
  }
}

