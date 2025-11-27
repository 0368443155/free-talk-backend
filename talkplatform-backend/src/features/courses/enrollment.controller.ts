import {
    Controller,
    Post,
    Get,
    Delete,
    Param,
    Body,
    UseGuards,
    Request,
    HttpCode,
    HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../core/auth/guards/jwt-auth.guard';
import { EnrollmentService } from './enrollment.service';
import { EnrollCourseDto, PurchaseSessionDto, CancelEnrollmentDto } from './dto/enrollment.dto';

@Controller('enrollments')
@UseGuards(JwtAuthGuard)
export class EnrollmentController {
    constructor(private readonly enrollmentService: EnrollmentService) { }

    /**
     * Enroll in full course
     * POST /api/enrollments/courses/:courseId
     */
    @Post('courses/:courseId')
    async enrollCourse(
        @Param('courseId') courseId: string,
        @Body() dto: EnrollCourseDto,
        @Request() req,
    ) {
        const userId = req.user.userId || req.user.id;
        return await this.enrollmentService.enrollFullCourse(userId, courseId, dto);
    }

    /**
     * Purchase single session
     * POST /api/enrollments/sessions/:sessionId/purchase
     */
    @Post('sessions/:sessionId/purchase')
    async purchaseSession(
        @Param('sessionId') sessionId: string,
        @Request() req,
    ) {
        const userId = req.user.userId || req.user.id;
        return await this.enrollmentService.purchaseSession(userId, sessionId);
    }

    /**
     * Cancel enrollment (refund)
     * DELETE /api/enrollments/:enrollmentId
     */
    @Delete(':enrollmentId')
    @HttpCode(HttpStatus.OK)
    async cancelEnrollment(
        @Param('enrollmentId') enrollmentId: string,
        @Request() req,
    ) {
        const userId = req.user.userId || req.user.id;
        return await this.enrollmentService.cancelEnrollment(userId, enrollmentId);
    }

    /**
     * Cancel session purchase (refund)
     * DELETE /api/enrollments/sessions/:purchaseId
     */
    @Delete('sessions/:purchaseId')
    @HttpCode(HttpStatus.OK)
    async cancelSessionPurchase(
        @Param('purchaseId') purchaseId: string,
        @Request() req,
    ) {
        const userId = req.user.userId || req.user.id;
        return await this.enrollmentService.cancelSessionPurchase(userId, purchaseId);
    }

    /**
     * Get my enrollments
     * GET /api/enrollments/me
     */
    @Get('me')
    async getMyEnrollments(@Request() req) {
        const userId = req.user.userId || req.user.id;
        return await this.enrollmentService.getMyEnrollments(userId);
    }

    /**
     * Get my session purchases
     * GET /api/enrollments/me/sessions
     */
    @Get('me/sessions')
    async getMySessionPurchases(@Request() req) {
        const userId = req.user.userId || req.user.id;
        return await this.enrollmentService.getMySessionPurchases(userId);
    }

    /**
     * Check access to session
     * GET /api/enrollments/sessions/:sessionId/access
     */
    @Get('sessions/:sessionId/access')
    async checkSessionAccess(
        @Param('sessionId') sessionId: string,
        @Request() req,
    ) {
        const userId = req.user.userId || req.user.id;
        const hasAccess = await this.enrollmentService.hasAccessToSession(
            userId,
            sessionId,
        );
        return { hasAccess };
    }

    /**
     * Check access to lesson
     * GET /api/enrollments/lessons/:lessonId/access
     */
    @Get('lessons/:lessonId/access')
    async checkLessonAccess(
        @Param('lessonId') lessonId: string,
        @Request() req,
    ) {
        const userId = req.user.userId || req.user.id;
        return await this.enrollmentService.hasAccessToLesson(
            userId,
            lessonId,
        );
    }
}
