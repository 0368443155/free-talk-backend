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
    ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { CoursesService } from './courses.service';
import { CreateCourseDto, UpdateCourseDto, GetCoursesQueryDto, CreateCourseWithSessionsDto } from './dto/course.dto';
import { CreateSessionDto, UpdateSessionDto } from './dto/session.dto';
import { CreateLessonDto, UpdateLessonDto } from './dto/lesson.dto';
import { JwtAuthGuard } from '../../core/auth/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../../core/auth/guards/optional-jwt-auth.guard';
import { RolesGuard } from '../../core/auth/guards/roles.guard';
import { Roles } from '../../auth/roles.decorator';
import { UserRole } from '../../users/user.entity';

@ApiTags('Courses')
@Controller('courses')
export class CoursesController {
    constructor(private readonly coursesService: CoursesService) { }

    // ==================== COURSE ENDPOINTS ====================

    @Post()
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.TEACHER, UserRole.ADMIN)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Create a new course (Teacher or Admin)' })
    @ApiResponse({ status: 201, description: 'Course created successfully' })
    @ApiResponse({ status: 400, description: 'Bad request' })
    @ApiResponse({ status: 403, description: 'Only teachers and admins can create courses' })
    async createCourse(@Req() req: any, @Body() dto: CreateCourseDto) {
        const teacherId = req.user?.id;
        if (!teacherId) {
            throw new ForbiddenException('User not authenticated');
        }
        return this.coursesService.createCourse(teacherId, dto);
    }

    @Post('with-sessions')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.TEACHER, UserRole.ADMIN)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Create course with sessions and materials (Teacher or Admin)' })
    @ApiResponse({ status: 201, description: 'Course with sessions created successfully' })
    @ApiResponse({ status: 400, description: 'Bad request' })
    @ApiResponse({ status: 403, description: 'Only teachers and admins can create courses' })
    async createCourseWithSessions(@Req() req: any, @Body() dto: CreateCourseWithSessionsDto) {
        const teacherId = req.user?.id;
        if (!teacherId) {
            throw new ForbiddenException('User not authenticated');
        }
        return this.coursesService.createCourseWithSessions(teacherId, dto);
    }

    @Get()
    @ApiOperation({ summary: 'Get all courses with filters' })
    @ApiResponse({ status: 200, description: 'Courses retrieved successfully' })
    async getCourses(@Query() query: GetCoursesQueryDto) {
        return this.coursesService.getCourses(query);
    }

    @Get('my-courses')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.TEACHER, UserRole.ADMIN)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Get my courses (Teacher or Admin)' })
    @ApiResponse({ status: 200, description: 'Courses retrieved successfully' })
    async getMyCourses(@Req() req: any, @Query('status') status?: string) {
        const teacherId = req.user.id;
        return this.coursesService.getTeacherCourses(teacherId, status as any);
    }

    @Get(':id')
    @UseGuards(OptionalJwtAuthGuard) // Optional: will parse token if present, but won't fail if missing
    @ApiOperation({ summary: 'Get course by ID' })
    @ApiResponse({ status: 200, description: 'Course retrieved successfully' })
    @ApiResponse({ status: 404, description: 'Course not found' })
    async getCourseById(@Param('id') id: string, @Req() req?: any) {
        // Try to get userId from request, but don't require authentication
        const userId = req?.user?.id;
        return this.coursesService.getCourseById(id, userId);
    }

    @Patch(':id')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.TEACHER, UserRole.ADMIN)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Update course (Teacher or Admin)' })
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
    @Roles(UserRole.TEACHER, UserRole.ADMIN)
    @ApiBearerAuth()
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: 'Delete course (Teacher or Admin)' })
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
    @Roles(UserRole.TEACHER, UserRole.ADMIN)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Regenerate QR code for course (Teacher or Admin)' })
    @ApiResponse({ status: 200, description: 'QR code regenerated successfully' })
    @ApiResponse({ status: 403, description: 'You can only regenerate QR code for your own courses' })
    async regenerateQrCode(@Param('id') id: string, @Req() req: any) {
        const teacherId = req.user.id;
        return this.coursesService.regenerateQrCode(id, teacherId);
    }

    @Patch(':id/publish')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.TEACHER, UserRole.ADMIN)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Publish course (Teacher or Admin)' })
    @ApiResponse({ status: 200, description: 'Course published successfully' })
    @ApiResponse({ status: 400, description: 'Course must have at least one session and pricing set' })
    @ApiResponse({ status: 403, description: 'You can only publish your own courses' })
    @ApiResponse({ status: 404, description: 'Course not found' })
    async publishCourse(@Param('id') id: string, @Req() req: any) {
        const teacherId = req.user.id;
        return this.coursesService.publishCourse(id, teacherId);
    }

    @Patch(':id/unpublish')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.TEACHER, UserRole.ADMIN)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Unpublish course (Teacher or Admin)' })
    @ApiResponse({ status: 200, description: 'Course unpublished successfully' })
    @ApiResponse({ status: 403, description: 'You can only unpublish your own courses' })
    @ApiResponse({ status: 404, description: 'Course not found' })
    async unpublishCourse(@Param('id') id: string, @Req() req: any) {
        const teacherId = req.user.id;
        return this.coursesService.unpublishCourse(id, teacherId);
    }

    // ==================== SESSION ENDPOINTS ====================

    @Post(':id/sessions')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.TEACHER, UserRole.ADMIN)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Add session to course (Teacher or Admin)' })
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
    @Roles(UserRole.TEACHER, UserRole.ADMIN)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Update session (Teacher or Admin)' })
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
    @Roles(UserRole.TEACHER, UserRole.ADMIN)
    @ApiBearerAuth()
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: 'Delete session (Teacher or Admin)' })
    @ApiResponse({ status: 204, description: 'Session deleted successfully' })
    @ApiResponse({ status: 403, description: 'You can only delete sessions of your own courses' })
    @ApiResponse({ status: 404, description: 'Session not found' })
    async deleteSession(@Param('sessionId') sessionId: string, @Req() req: any) {
        const teacherId = req.user.id;
        await this.coursesService.deleteSession(sessionId, teacherId);
    }

    // ==================== LESSON ENDPOINTS ====================

    @Get(':id/sessions/:sessionId/lessons')
    @ApiOperation({ summary: 'Get all lessons for a session' })
    @ApiResponse({ status: 200, description: 'Lessons retrieved successfully' })
    @ApiResponse({ status: 404, description: 'Session not found' })
    async getSessionLessons(@Param('sessionId') sessionId: string) {
        return this.coursesService.getSessionLessons(sessionId);
    }

    @Get(':id/sessions/:sessionId/lessons/:lessonId')
    @ApiOperation({ summary: 'Get lesson by ID' })
    @ApiResponse({ status: 200, description: 'Lesson retrieved successfully' })
    @ApiResponse({ status: 404, description: 'Lesson not found' })
    async getLessonById(@Param('lessonId') lessonId: string) {
        return this.coursesService.getLessonById(lessonId);
    }

    @Post(':id/sessions/:sessionId/lessons')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.TEACHER, UserRole.ADMIN)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Add lesson to session (Teacher or Admin)' })
    @ApiResponse({ status: 201, description: 'Lesson added successfully' })
    @ApiResponse({ status: 400, description: 'Bad request' })
    @ApiResponse({ status: 403, description: 'You can only add lessons to your own course sessions' })
    async addLesson(
        @Param('sessionId') sessionId: string,
        @Req() req: any,
        @Body() dto: CreateLessonDto,
    ) {
        const teacherId = req.user.id;
        return this.coursesService.addLesson(sessionId, teacherId, dto);
    }

    @Patch(':id/sessions/:sessionId/lessons/:lessonId')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.TEACHER, UserRole.ADMIN)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Update lesson (Teacher or Admin)' })
    @ApiResponse({ status: 200, description: 'Lesson updated successfully' })
    @ApiResponse({ status: 403, description: 'You can only update lessons of your own courses' })
    @ApiResponse({ status: 404, description: 'Lesson not found' })
    async updateLesson(
        @Param('lessonId') lessonId: string,
        @Req() req: any,
        @Body() dto: UpdateLessonDto,
    ) {
        const teacherId = req.user.id;
        return this.coursesService.updateLesson(lessonId, teacherId, dto);
    }

    @Delete(':id/sessions/:sessionId/lessons/:lessonId')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.TEACHER, UserRole.ADMIN)
    @ApiBearerAuth()
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: 'Delete lesson (Teacher or Admin)' })
    @ApiResponse({ status: 204, description: 'Lesson deleted successfully' })
    @ApiResponse({ status: 403, description: 'You can only delete lessons of your own courses' })
    @ApiResponse({ status: 404, description: 'Lesson not found' })
    async deleteLesson(@Param('lessonId') lessonId: string, @Req() req: any) {
        const teacherId = req.user.id;
        await this.coursesService.deleteLesson(lessonId, teacherId);
    }

    // ==================== MEETING ENDPOINTS ====================

    @Get(':id/meetings')
    @ApiOperation({ summary: 'Get all meetings for a course' })
    @ApiResponse({ status: 200, description: 'Meetings retrieved successfully' })
    @ApiResponse({ status: 404, description: 'Course not found' })
    async getCourseMeetings(@Param('id') courseId: string) {
        return this.coursesService.getCourseMeetings(courseId);
    }
}
