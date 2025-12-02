import {
    Controller,
    Get,
    Post,
    Put,
    Delete,
    Body,
    Param,
    UseGuards,
    Request,
    HttpCode,
    HttpStatus,
    Patch,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { ReviewService } from './services/review.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { JwtAuthGuard } from '../../core/auth/guards/jwt-auth.guard';
import { Review } from './entities/review.entity';

@ApiTags('Reviews')
@Controller('courses/:courseId/reviews')
export class ReviewController {
    constructor(private readonly reviewService: ReviewService) { }

    @Get()
    @ApiOperation({ summary: 'Get all reviews for a course' })
    @ApiResponse({ status: 200, description: 'List of reviews' })
    async getCourseReviews(
        @Param('courseId') courseId: string,
        @Request() req?: any,
    ): Promise<Review[]> {
        const userId = req?.user?.id;
        return this.reviewService.getCourseReviews(courseId, userId);
    }

    @Get('stats')
    @ApiOperation({ summary: 'Get review statistics for a course' })
    @ApiResponse({ status: 200, description: 'Review statistics' })
    async getReviewStats(@Param('courseId') courseId: string) {
        return this.reviewService.getReviewStats(courseId);
    }

    @Get('my')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Get current user\'s review for a course' })
    @ApiResponse({ status: 200, description: 'User review or null' })
    async getMyReview(
        @Param('courseId') courseId: string,
        @Request() req: any,
    ): Promise<Review | null> {
        return this.reviewService.getUserReview(courseId, req.user.id);
    }

    @Post()
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Create or update a review for a course' })
    @ApiResponse({ status: 201, description: 'Review created/updated' })
    @ApiResponse({ status: 403, description: 'User must purchase course to review' })
    async createReview(
        @Param('courseId') courseId: string,
        @Body() createReviewDto: CreateReviewDto,
        @Request() req: any,
    ): Promise<Review> {
        return this.reviewService.createOrUpdateReview(
            courseId,
            req.user.id,
            createReviewDto,
        );
    }

    @Delete()
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: 'Delete current user\'s review' })
    @ApiResponse({ status: 204, description: 'Review deleted' })
    async deleteReview(
        @Param('courseId') courseId: string,
        @Request() req: any,
    ): Promise<void> {
        return this.reviewService.deleteReview(courseId, req.user.id);
    }

    @Patch(':reviewId/hide')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Hide a review (free courses only, teacher only)' })
    @ApiResponse({ status: 200, description: 'Review hidden' })
    @ApiResponse({ status: 403, description: 'Only teacher can hide reviews, and only for free courses' })
    async hideReview(
        @Param('courseId') courseId: string,
        @Param('reviewId') reviewId: string,
        @Request() req: any,
    ): Promise<Review> {
        return this.reviewService.toggleReviewVisibility(reviewId, req.user.id, true);
    }

    @Patch(':reviewId/show')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Show a review (free courses only, teacher only)' })
    @ApiResponse({ status: 200, description: 'Review shown' })
    @ApiResponse({ status: 403, description: 'Only teacher can show reviews, and only for free courses' })
    async showReview(
        @Param('courseId') courseId: string,
        @Param('reviewId') reviewId: string,
        @Request() req: any,
    ): Promise<Review> {
        return this.reviewService.toggleReviewVisibility(reviewId, req.user.id, false);
    }
}

