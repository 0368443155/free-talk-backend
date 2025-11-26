import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../core/auth/guards/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../core/auth/guards/roles.guard';
import { UserRole } from '../users/user.entity';
import { VerificationStatus } from '../features/teachers/entities/teacher-verification.entity';

@ApiTags('Admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('users')
  listUsers(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('role') role?: UserRole,
    @Query('search') search?: string,
  ) {
    return this.adminService.listUsers({ page: Number(page) || 1, limit: Number(limit) || 20, role, search });
  }

  @Patch('users/:id/role')
  updateUserRole(@Param('id') id: string, @Body() body: { role: UserRole }) {
    return this.adminService.updateUserRole(id, body.role);
  }

  @Patch('users/:id/credits')
  adjustCredits(@Param('id') id: string, @Body() body: { delta?: number; setTo?: number }) {
    return this.adminService.adjustUserCredits(id, body.delta, body.setTo);
  }

  @Get('teachers')
  listTeachers(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('is_verified') is_verified?: string,
    @Query('search') search?: string,
  ) {
    return this.adminService.listTeachers({
      page: Number(page) || 1,
      limit: Number(limit) || 20,
      is_verified: typeof is_verified === 'string' ? is_verified === 'true' : undefined,
      search,
    });
  }

  @Patch('teachers/:id/verify')
  verifyTeacher(@Param('id') id: string, @Body() body: { is_verified: boolean }) {
    return this.adminService.verifyTeacher(id, body.is_verified);
  }

  @Patch('teachers/:id/revoke')
  revokeTeacherStatus(@Param('id') id: string, @Body() body: { reason?: string }) {
    return this.adminService.revokeTeacherStatus(id, body.reason);
  }

  @Get('settings/platform-fee')
  getFees() {
    return this.adminService.getPlatformFees();
  }

  @Patch('settings/platform-fee')
  setFees(
    @Body()
    body: {
      platformStudent: { platform: number; teacher: number };
      teacherAffiliateStudent: { platform: number; teacher: number };
    },
  ) {
    return this.adminService.setPlatformFees(body);
  }

  @Get('users/:id')
  getUser(@Param('id') id: string) {
    return this.adminService.getUserById(id);
  }

  @Patch('users/:id')
  updateUser(@Param('id') id: string, @Body() body: { username?: string; email?: string }) {
    return this.adminService.updateUser(id, body);
  }

  @Delete('users/:id')
  deleteUser(@Param('id') id: string) {
    return this.adminService.deleteUser(id);
  }

  @Post('users')
  createUser(@Body() body: { username: string; email: string; password: string; role: UserRole }) {
    return this.adminService.createUser(body);
  }

  @Get('teacher-verifications')
  listTeacherVerifications(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('status') status?: VerificationStatus,
    @Query('search') search?: string,
  ) {
    return this.adminService.listTeacherVerifications({
      page: Number(page) || 1,
      limit: Number(limit) || 20,
      status: status as VerificationStatus,
      search,
    });
  }
}
