import { Controller, Patch, Param, Body, UseGuards } from '@nestjs/common';
import { MaterialService } from '../services/material.service';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../core/auth/guards/roles.guard';
import { Roles } from '../../../auth/roles.decorator';
import { UserRole } from '../../../users/user.entity';

@Controller('marketplace/admin/materials')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminMaterialController {
    constructor(private readonly materialService: MaterialService) { }

    @Patch(':id/approve')
    approve(@Param('id') id: string) {
        return this.materialService.adminUpdateStatus(id, true);
    }

    @Patch(':id/reject')
    reject(@Param('id') id: string) {
        return this.materialService.adminUpdateStatus(id, false);
    }
}
