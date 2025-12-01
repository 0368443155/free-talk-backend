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
import { RolloutService } from './services/rollout.service';
import { GradualRolloutDto } from './dto/gradual-rollout.dto';

@ApiTags('Feature Flags')
@Controller('admin/feature-flags')
export class FeatureFlagController {
  constructor(
    private readonly featureFlagService: FeatureFlagService,
    private readonly rolloutService: RolloutService,
  ) {}

  @Get('public/:name')
  @ApiOperation({ summary: 'Get feature flag by name (public endpoint for client-side checks)' })
  async getByNamePublic(@Param('name') name: string) {
    // Public endpoint - no auth required, but only returns enabled status and rollout percentage
    const flag = await this.featureFlagService.getByName(name);
    if (!flag) {
      return { enabled: false, rollout_percentage: 0 };
    }
    return {
      enabled: flag.enabled,
      rollout_percentage: flag.rollout_percentage,
    };
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all feature flags' })
  async getAll() {
    return this.featureFlagService.getAll();
  }

  @Get(':name')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get feature flag by name' })
  async getByName(@Param('name') name: string) {
    return this.featureFlagService.getByName(name);
  }

  @Post(':name/enable')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
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
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Disable a feature flag' })
  async disable(@Param('name') name: string) {
    await this.featureFlagService.disable(name);
    return { success: true, message: `Feature flag ${name} disabled` };
  }

  @Patch(':name/rollout')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
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

  @Post(':name/gradual-rollout')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Start gradual rollout (10% → 25% → 50% → 100%)' })
  async gradualRollout(
    @Param('name') name: string,
    @Body() dto: GradualRolloutDto,
  ) {
    const currentFlag = await this.featureFlagService.getByName(name);
    const currentPercentage = dto.currentPercentage ?? currentFlag?.rollout_percentage ?? 0;
    
    await this.rolloutService.gradualRollout(
      name,
      dto.targetPercentage,
      currentPercentage,
    );
    
    return {
      success: true,
      message: `Gradual rollout started for ${name}: ${currentPercentage}% → ${dto.targetPercentage}%`,
    };
  }

  @Post(':name/rollback')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Rollback feature flag to 0%' })
  async rollback(@Param('name') name: string) {
    await this.rolloutService.rollback(name);
    return {
      success: true,
      message: `Feature flag ${name} rolled back to 0%`,
    };
  }
}

