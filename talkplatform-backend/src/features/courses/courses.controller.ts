import {
    Controller,
    Get,
    Post,
    Patch,
    Delete,
    Body,
    Param,
    Query,
    UseGuards,
    Req,
    HttpCode,
    HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { CoursesService } from './courses.service';
import { CreateCourseDto, UpdateCourseDto, GetCoursesQueryDto } from './dto/course.dto';
import { CreateSessionDto, UpdateSessionDto } from './dto/session.dto';
import { JwtAuthGuard } from '../../core/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../core/auth/guards/roles.guard';
import { Roles } from '../../core/auth/decorators/roles.decorator';

@ApiTags('Courses')
@Controller('courses')
export class CoursesController {
    constructor(private readonly coursesService: CoursesService) { }

    // ==================== COURSE ENDPOINTS ====================

    @Post()
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('teacher')
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Create a new course (Teacher only)' })
    @ApiResponse({ status: 201, description: 'Course created successfully' })
    @ApiResponse({ status: 400, description: 'Bad request' })
    @ApiResponse({ status: 403, description: 'Only verified teachers can create courses' })
    async createCourse(@Req() req: any, @Body() dto: CreateCourseDto) {
        const teacherId = req.user.id;
        return this.coursesService.createCourse(teacherId, dto);
    }

    @Get()
    @ApiOperation({ summary: 'Get all courses with filters' })
    @ApiResponse({ status: 200, description: 'Courses retrieved successfully' })
    async getCourses(@Query() query: GetCoursesQueryDto) {
        return this.coursesService.getCourses(query);
    }

    @Get('my-courses')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('teacher')
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Get my courses (Teacher only)' })
    @ApiResponse({ status: 200, description: 'Courses retrieved successfully' })
    async getMyCourses(@Req() req: any, @Query('status') status?: string) {
        const teacherId = req.user.id;
        return this.coursesService.getTeacherCourses(teacherId, status as any);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get course by ID' })
    @ApiResponse({ status: 200, description: 'Course retrieved successfully' })
    @ApiResponse({ status: 404, description: 'Course not found' })
    async getCourseById(@Param('id') id: string) {
        return this.coursesService.getCourseById(id);
    }

    @Patch(':id')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('teacher')
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Update course (Teacher only)' })
    @ApiResponse({ status: 200, description: 'Course updated successfully' })
    @ApiResponse({ status: 403, description: 'You can only update your own courses' })
    @ApiResponse({ status: 404, description: 'Course not found' })
    async updateCourse(
        @Param('id') id: string,
        @Req() req: any,
        @Body() dto: UpdateCourseDto,
    ) {
        const teacherId = req.user.id;
        return this.coursesService.updateCourse(id, teacherId, dto);
    }

    @Delete(':id')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('teacher')
    @ApiBearerAuth()
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: 'Delete course (Teacher only)' })
    @ApiResponse({ status: 204, description: 'Course deleted successfully' })
    @ApiResponse({ status: 400, description: 'Cannot delete course with enrolled students' })
    @ApiResponse({ status: 403, description: 'You can only delete your own courses' })
    @ApiResponse({ status: 404, description: 'Course not found' })
    async deleteCourse(@Param('id') id: string, @Req() req: any) {
        const teacherId = req.user.id;
        await this.coursesService.deleteCourse(id, teacherId);
    }

    @Post(':id/regenerate-qr')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('teacher')
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Regenerate QR code for course (Teacher only)' })
    @ApiResponse({ status: 200, description: 'QR code regenerated successfully' })
    @ApiResponse({ status: 403, description: 'You can only regenerate QR code for your own courses' })
    async regenerateQrCode(@Param('id') id: string, @Req() req: any) {
        const teacherId = req.user.id;
        return this.coursesService.regenerateQrCode(id, teacherId);
    }

    // ==================== SESSION ENDPOINTS ====================

    @Post(':id/sessions')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('teacher')
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Add session to course (Teacher only)' })
    @ApiResponse({ status: 201, description: 'Session added successfully' })
    @ApiResponse({ status: 400, description: 'Session number already exists' })
    @ApiResponse({ status: 403, description: 'You can only add sessions to your own courses' })
    async addSession(
        @Param('id') courseId: string,
        @Req() req: any,
        @Body() dto: CreateSessionDto,
    ) {
        const teacherId = req.user.id;
        return this.coursesService.addSession(courseId, teacherId, dto);
    }

    @Get(':id/sessions')
    @ApiOperation({ summary: 'Get all sessions for a course' })
    @ApiResponse({ status: 200, description: 'Sessions retrieved successfully' })
    @ApiResponse({ status: 404, description: 'Course not found' })
    async getCourseSessions(@Param('id') courseId: string) {
        return this.coursesService.getCourseSessions(courseId);
    }

    @Get(':id/sessions/:sessionId')
    @ApiOperation({ summary: 'Get session by ID' })
    @ApiResponse({ status: 200, description: 'Session retrieved successfully' })
    @ApiResponse({ status: 404, description: 'Session not found' })
    async getSessionById(@Param('sessionId') sessionId: string) {
        return this.coursesService.getSessionById(sessionId);
    }

    @Patch(':id/sessions/:sessionId')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('teacher')
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Update session (Teacher only)' })
    @ApiResponse({ status: 200, description: 'Session updated successfully' })
    @ApiResponse({ status: 403, description: 'You can only update sessions of your own courses' })
    @ApiResponse({ status: 404, description: 'Session not found' })
    async updateSession(
        @Param('sessionId') sessionId: string,
        @Req() req: any,
        @Body() dto: UpdateSessionDto,
    ) {
        const teacherId = req.user.id;
        return this.coursesService.updateSession(sessionId, teacherId, dto);
    }

    @Delete(':id/sessions/:sessionId')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('teacher')
    @ApiBearerAuth()
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: 'Delete session (Teacher only)' })
    @ApiResponse({ status: 204, description: 'Session deleted successfully' })
    @ApiResponse({ status: 403, description: 'You can only delete sessions of your own courses' })
    @ApiResponse({ status: 404, description: 'Session not found' })
    async deleteSession(@Param('sessionId') sessionId: string, @Req() req: any) {
        const teacherId = req.user.id;
        await this.coursesService.deleteSession(sessionId, teacherId);
    }
}
