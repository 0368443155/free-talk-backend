import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../core/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../core/auth/guards/roles.guard';
import { Roles } from '../core/auth/decorators/roles.decorator';
import { UserRole } from '../users/user.entity';
import { WithdrawalService } from '../features/payments/withdrawal.service';
import { WithdrawalStatus } from '../features/payments/entities/withdrawal.entity';

@ApiTags('Admin - Withdrawals')
@Controller('admin/withdrawals')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@ApiBearerAuth()
export class AdminWithdrawalController {
  constructor(private readonly withdrawalService: WithdrawalService) {}

  @Get()
  @ApiOperation({ summary: 'Get all withdrawals' })
  async getAllWithdrawals(@Param('status') status?: WithdrawalStatus) {
    return this.withdrawalService.getAllWithdrawals(status);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get withdrawal by ID' })
  async getWithdrawalById(@Param('id') id: string) {
    return this.withdrawalService.getWithdrawalById(id);
  }

  @Post(':id/approve')
  @ApiOperation({ summary: 'Approve withdrawal' })
  async approveWithdrawal(
    @Param('id') id: string,
    @Body() body: { admin_notes?: string },
  ) {
    return this.withdrawalService.approveWithdrawal(id, body.admin_notes);
  }

  @Post(':id/complete')
  @ApiOperation({ summary: 'Complete withdrawal (after bank transfer)' })
  async completeWithdrawal(
    @Param('id') id: string,
    @Body() body: { admin_notes?: string },
  ) {
    return this.withdrawalService.completeWithdrawal(id, body.admin_notes);
  }

  @Post(':id/reject')
  @ApiOperation({ summary: 'Reject withdrawal' })
  async rejectWithdrawal(
    @Param('id') id: string,
    @Body() body: { admin_notes: string },
  ) {
    return this.withdrawalService.rejectWithdrawal(id, body.admin_notes);
  }
}

