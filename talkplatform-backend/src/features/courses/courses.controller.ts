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
    NotFoundException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { CreateCourseDto, UpdateCourseDto, GetCoursesQueryDto, CreateCourseWithSessionsDto } from './dto/course.dto';
import { CreateSessionDto, UpdateSessionDto } from './dto/session.dto';
import { CreateLessonDto, UpdateLessonDto } from './dto/lesson.dto';
import { JwtAuthGuard } from '../../core/auth/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../../core/auth/guards/optional-jwt-auth.guard';
import { RolesGuard } from '../../core/auth/guards/roles.guard';
import { Roles } from '../../auth/roles.decorator';
import { UserRole } from '../../users/user.entity';
import { CourseAccessGuard } from './guards/course-access.guard';
import { MeetingsService } from '../meeting/meetings.service';
import { EnrollmentService } from './enrollment.service';

// Commands
import { CreateCourseCommand } from './application/commands/create-course.command';
import { CreateCourseWithSessionsCommand } from './application/commands/create-course-with-sessions.command';
import { UpdateCourseCommand } from './application/commands/update-course.command';
import { DeleteCourseCommand } from './application/commands/delete-course.command';
import { PublishCourseCommand } from './application/commands/publish-course.command';
import { UnpublishCourseCommand } from './application/commands/unpublish-course.command';
import { AddSessionCommand } from './application/commands/add-session.command';
import { UpdateSessionCommand } from './application/commands/update-session.command';
import { DeleteSessionCommand } from './application/commands/delete-session.command';
import { AddLessonCommand } from './application/commands/add-lesson.command';
import { UpdateLessonCommand } from './application/commands/update-lesson.command';
import { DeleteLessonCommand } from './application/commands/delete-lesson.command';
import { RegenerateQrCodeCommand } from './application/commands/regenerate-qr-code.command';

// Queries
import { GetCoursesQuery } from './application/queries/get-courses.query';
import { GetCourseDetailsQuery } from './application/queries/get-course-details.query';
import { GetTeacherCoursesQuery } from './application/queries/get-teacher-courses.query';
import { GetCourseSessionsQuery } from './application/queries/get-course-sessions.query';
import { GetSessionByIdQuery } from './application/queries/get-session-by-id.query';
import { GetSessionLessonsQuery } from './application/queries/get-session-lessons.query';
import { GetLessonByIdQuery } from './application/queries/get-lesson-by-id.query';
import { GetLessonMaterialsQuery } from './application/queries/get-lesson-materials.query';
import { GetLessonMaterialByIdQuery } from './application/queries/get-lesson-material-by-id.query';
import { CheckLessonMaterialAccessQuery } from './application/queries/check-lesson-material-access.query';
import { GetCourseMeetingsQuery } from './application/queries/get-course-meetings.query';
import { CourseStatus, PriceType } from './entities/course.entity';

@ApiTags('Courses')
@Controller('courses')
export class CoursesController {
    constructor(
        private readonly commandBus: CommandBus,
        private readonly queryBus: QueryBus,
        private readonly meetingsService: MeetingsService,
        private readonly enrollmentService: EnrollmentService,
    ) { }

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
        const command = new CreateCourseCommand(
            teacherId,
            dto.title,
            dto.description,
            dto.category as any,
            dto.level as any,
            dto.language,
            dto.price_type,
            dto.price_full_course,
            dto.price_per_session,
            dto.max_students || 20,
            dto.duration_hours || 0,
            dto.tags || [],
        );
        return this.commandBus.execute(command);
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
        const command = new CreateCourseWithSessionsCommand(teacherId, dto);
        return this.commandBus.execute(command);
    }

    @Get()
    @ApiOperation({ summary: 'Get all courses with filters' })
    @ApiResponse({ status: 200, description: 'Courses retrieved successfully' })
    async getCourses(@Query() query: GetCoursesQueryDto) {
        const getCoursesQuery = new GetCoursesQuery(
            {
                teacherId: query.teacher_id,
                status: query.status as any,
                category: query.category as any,
                level: query.level as any,
                language: query.language,
                isPublished: true, // Only published courses by default
                search: query.search,
            },
            {
                page: query.page || 1,
                limit: query.limit || 20,
            },
        );
        return this.queryBus.execute(getCoursesQuery);
    }

    @Get('my-courses')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.TEACHER, UserRole.ADMIN)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Get my courses (Teacher or Admin)' })
    @ApiResponse({ status: 200, description: 'Courses retrieved successfully' })
    async getMyCourses(@Req() req: any, @Query('status') status?: string) {
        const teacherId = req.user.id;
        const query = new GetTeacherCoursesQuery(teacherId, status as any);
        return this.queryBus.execute(query);
    }

    @Get(':id')
    @UseGuards(OptionalJwtAuthGuard) // Optional: will parse token if present, but won't fail if missing
    @ApiOperation({ summary: 'Get course by ID' })
    @ApiResponse({ status: 200, description: 'Course retrieved successfully' })
    @ApiResponse({ status: 404, description: 'Course not found' })
    async getCourseById(@Param('id') id: string, @Req() req?: any) {
        const query = new GetCourseDetailsQuery(id, true); // Include sessions
        return this.queryBus.execute(query);
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
        const command = new UpdateCourseCommand(id, teacherId, dto);
        const result = await this.commandBus.execute(command);
        return result.entity;
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
        const command = new DeleteCourseCommand(id, teacherId);
        await this.commandBus.execute(command);
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
        const command = new RegenerateQrCodeCommand(id, teacherId);
        await this.commandBus.execute(command);
        // Return updated course
        const query = new GetCourseDetailsQuery(id);
        return this.queryBus.execute(query);
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
        const command = new PublishCourseCommand(id, teacherId);
        await this.commandBus.execute(command);
        // Return updated course
        const query = new GetCourseDetailsQuery(id);
        return this.queryBus.execute(query);
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
        const command = new UnpublishCourseCommand(id, teacherId);
        await this.commandBus.execute(command);
        // Return updated course
        const query = new GetCourseDetailsQuery(id);
        return this.queryBus.execute(query);
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
        const command = new AddSessionCommand(courseId, teacherId, dto);
        return this.commandBus.execute(command);
    }

    @Get(':id/sessions')
    @ApiOperation({ summary: 'Get all sessions for a course' })
    @ApiResponse({ status: 200, description: 'Sessions retrieved successfully' })
    @ApiResponse({ status: 404, description: 'Course not found' })
    async getCourseSessions(@Param('id') courseId: string) {
        const query = new GetCourseSessionsQuery(courseId);
        return this.queryBus.execute(query);
    }

    @Get(':id/sessions/:sessionId')
    @ApiOperation({ summary: 'Get session by ID' })
    @ApiResponse({ status: 200, description: 'Session retrieved successfully' })
    @ApiResponse({ status: 404, description: 'Session not found' })
    async getSessionById(@Param('sessionId') sessionId: string) {
        const query = new GetSessionByIdQuery(sessionId);
        return this.queryBus.execute(query);
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
        const command = new UpdateSessionCommand(sessionId, teacherId, dto);
        return this.commandBus.execute(command);
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
        const command = new DeleteSessionCommand(sessionId, teacherId);
        await this.commandBus.execute(command);
    }

    // ==================== LESSON ENDPOINTS ====================

    @Get(':id/sessions/:sessionId/lessons')
    @ApiOperation({ summary: 'Get all lessons for a session' })
    @ApiResponse({ status: 200, description: 'Lessons retrieved successfully' })
    @ApiResponse({ status: 404, description: 'Session not found' })
    async getSessionLessons(@Param('sessionId') sessionId: string) {
        const query = new GetSessionLessonsQuery(sessionId);
        return this.queryBus.execute(query);
    }

    @Get(':id/sessions/:sessionId/lessons/:lessonId')
    @ApiOperation({ summary: 'Get lesson by ID' })
    @ApiResponse({ status: 200, description: 'Lesson retrieved successfully' })
    @ApiResponse({ status: 404, description: 'Lesson not found' })
    async getLessonById(@Param('lessonId') lessonId: string) {
        const query = new GetLessonByIdQuery(lessonId);
        return this.queryBus.execute(query);
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
        const command = new AddLessonCommand(sessionId, teacherId, dto);
        return this.commandBus.execute(command);
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
        const command = new UpdateLessonCommand(lessonId, teacherId, dto);
        return this.commandBus.execute(command);
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
        const command = new DeleteLessonCommand(lessonId, teacherId);
        await this.commandBus.execute(command);
    }

    // ==================== LESSON MEETING ENDPOINTS ====================

    @Post(':id/sessions/:sessionId/lessons/:lessonId/join')
    @UseGuards(JwtAuthGuard, CourseAccessGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Join lesson meeting (requires purchase)' })
    @ApiResponse({ status: 200, description: 'Joined lesson meeting successfully' })
    @ApiResponse({ status: 403, description: 'Access denied - purchase required' })
    @ApiResponse({ status: 400, description: 'Cannot join - time validation failed' })
    async joinLessonMeeting(
        @Param('lessonId') lessonId: string,
        @Req() req: any,
    ) {
        const userId = req.user.userId || req.user.id;
        return this.meetingsService.joinLessonMeeting(userId, lessonId);
    }

    @Get(':id/sessions/:sessionId/lessons/:lessonId/access')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Check access to lesson' })
    @ApiResponse({ status: 200, description: 'Access check result' })
    async checkLessonAccess(
        @Param('lessonId') lessonId: string,
        @Req() req: any,
    ) {
        const userId = req.user.userId || req.user.id;
        return this.enrollmentService.hasAccessToLesson(userId, lessonId);
    }

    // ==================== MATERIAL ACCESS ENDPOINTS ====================

    @Get('lessons/:lessonId/materials')
    @UseGuards(JwtAuthGuard, CourseAccessGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Get lesson materials (requires purchase)' })
    @ApiResponse({ status: 200, description: 'Lesson materials retrieved successfully' })
    @ApiResponse({ status: 403, description: 'Forbidden: Purchase required or no access' })
    @ApiResponse({ status: 404, description: 'Lesson not found' })
    async getLessonMaterials(
        @Param('lessonId') lessonId: string,
    ) {
        const query = new GetLessonMaterialsQuery(lessonId);
        return this.queryBus.execute(query);
    }

    @Get('materials/:materialId/download')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Download material (requires purchase)' })
    @ApiResponse({ status: 200, description: 'Material download initiated' })
    @ApiResponse({ status: 403, description: 'Forbidden: Purchase required or no access' })
    @ApiResponse({ status: 404, description: 'Material not found' })
    async downloadMaterial(
        @Param('materialId') materialId: string,
        @Req() req: any,
    ) {
        const userId = req.user.userId || req.user.id;
        const accessQuery = new CheckLessonMaterialAccessQuery(userId, materialId);
        const hasAccess = await this.queryBus.execute(accessQuery);

        if (!hasAccess) {
            throw new ForbiddenException('Purchase required to download this material');
        }

        // Get material details
        const materialQuery = new GetLessonMaterialByIdQuery(materialId);
        const material = await this.queryBus.execute(materialQuery);
        if (!material) {
            throw new NotFoundException('Material not found');
        }

        // Return material info for download (actual file serving can be handled by storage service)
        return {
            material,
            downloadUrl: material.file_url,
            message: 'Download URL provided. Use this URL to download the file.',
        };
    }

    // ==================== MEETING ENDPOINTS ====================

    @Get(':id/meetings')
    @ApiOperation({ summary: 'Get all meetings for a course' })
    @ApiResponse({ status: 200, description: 'Meetings retrieved successfully' })
    @ApiResponse({ status: 404, description: 'Course not found' })
    async getCourseMeetings(@Param('id') courseId: string) {
        const query = new GetCourseMeetingsQuery(courseId);
        return this.queryBus.execute(query);
    }
}
