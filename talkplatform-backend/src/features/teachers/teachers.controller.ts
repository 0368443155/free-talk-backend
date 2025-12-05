import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../core/auth/guards/jwt-auth.guard';
import { EnhancedTeachersService } from './enhanced-teachers.service';

@ApiTags('Teachers')
@Controller('teachers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
export class TeachersController {
    constructor(private readonly teachersService: EnhancedTeachersService) { }

    @Get(':id/profile')
    @ApiOperation({ summary: 'Get teacher profile by ID' })
    @ApiResponse({ status: 200, description: 'Teacher profile retrieved successfully' })
    async getTeacherProfile(@Param('id') id: string) {
        return this.teachersService.getPublicTeacherProfile(id);
    }
}
