import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { FeatureFlagService } from './feature-flag.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../../users/user.entity';
import { UpdateFeatureFlagDto } from './dto/update-feature-flag.dto';

@ApiTags('Feature Flags')
@Controller('admin/feature-flags')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@ApiBearerAuth()
export class FeatureFlagController {
  constructor(private readonly featureFlagService: FeatureFlagService) {}

  @Get()
  @ApiOperation({ summary: 'Get all feature flags' })
  async getAll() {
    return this.featureFlagService.getAll();
  }

  @Get(':name')
  @ApiOperation({ summary: 'Get feature flag by name' })
  async getByName(@Param('name') name: string) {
    return this.featureFlagService.getByName(name);
  }

  @Post(':name/enable')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Enable a feature flag' })
  async enable(
    @Param('name') name: string,
    @Body() dto: { rolloutPercentage?: number },
  ) {
    await this.featureFlagService.enable(name, dto.rolloutPercentage || 100);
    return { success: true, message: `Feature flag ${name} enabled` };
  }

  @Post(':name/disable')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Disable a feature flag' })
  async disable(@Param('name') name: string) {
    await this.featureFlagService.disable(name);
    return { success: true, message: `Feature flag ${name} disabled` };
  }

  @Patch(':name/rollout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update rollout percentage' })
  async updateRollout(
    @Param('name') name: string,
    @Body() dto: UpdateFeatureFlagDto,
  ) {
    await this.featureFlagService.updateRollout(name, dto.rolloutPercentage);
    return {
      success: true,
      message: `Feature flag ${name} rollout updated to ${dto.rolloutPercentage}%`,
    };
  }
}

