import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Review } from '../entities/review.entity';
import { Course } from '../entities/course.entity';
import { CourseEnrollment, EnrollmentStatus } from '../entities/enrollment.entity';
import { CreateReviewDto } from '../dto/create-review.dto';

@Injectable()
export class ReviewService {
    constructor(
        @InjectRepository(Review)
        private reviewRepository: Repository<Review>,
        @InjectRepository(Course)
        private courseRepository: Repository<Course>,
        @InjectRepository(CourseEnrollment)
        private enrollmentRepository: Repository<CourseEnrollment>,
    ) { }

    /**
     * Create or update a review for a course
     */
    async createOrUpdateReview(
        courseId: string,
        userId: string,
        createReviewDto: CreateReviewDto,
    ): Promise<Review> {
        // Check if course exists
        const course = await this.courseRepository.findOne({ where: { id: courseId } });
        if (!course) {
            throw new NotFoundException('Course not found');
        }

        // Check if user is enrolled in the course
        const enrollment = await this.enrollmentRepository.findOne({
            where: {
                course_id: courseId,
                user_id: userId,
                status: EnrollmentStatus.ACTIVE,
            },
        });

        if (!enrollment) {
            throw new ForbiddenException('You must be enrolled in this course to leave a review');
        }

        // Check if review already exists
        let review = await this.reviewRepository.findOne({
            where: {
                course_id: courseId,
                user_id: userId,
            },
        });

        if (review) {
            // Update existing review
            review.rating = createReviewDto.rating;
            if (createReviewDto.comment !== undefined) {
                review.comment = createReviewDto.comment;
            }
        } else {
            // Create new review
            review = this.reviewRepository.create({
                course_id: courseId,
                user_id: userId,
                rating: createReviewDto.rating,
                comment: createReviewDto.comment,
            });
        }

        await this.reviewRepository.save(review);

        // Update course average rating
        await this.updateCourseRating(courseId);

        return review;
    }

    /**
     * Get all reviews for a course
     */
    async getCourseReviews(courseId: string): Promise<Review[]> {
        return this.reviewRepository.find({
            where: { course_id: courseId },
            relations: ['user'],
            order: { created_at: 'DESC' },
        });
    }

    /**
     * Get user's review for a course
     */
    async getUserReview(courseId: string, userId: string): Promise<Review | null> {
        return this.reviewRepository.findOne({
            where: {
                course_id: courseId,
                user_id: userId,
            },
            relations: ['user'],
        });
    }

    /**
     * Delete a review
     */
    async deleteReview(courseId: string, userId: string): Promise<void> {
        const review = await this.reviewRepository.findOne({
            where: {
                course_id: courseId,
                user_id: userId,
            },
        });

        if (!review) {
            throw new NotFoundException('Review not found');
        }

        await this.reviewRepository.remove(review);

        // Update course average rating
        await this.updateCourseRating(courseId);
    }

    /**
     * Update course average rating and total reviews
     */
    private async updateCourseRating(courseId: string): Promise<void> {
        const result = await this.reviewRepository
            .createQueryBuilder('review')
            .select('AVG(review.rating)', 'average')
            .addSelect('COUNT(review.id)', 'total')
            .where('review.course_id = :courseId', { courseId })
            .getRawOne();

        const average = parseFloat(result.average) || 0;
        const total = parseInt(result.total) || 0;

        await this.courseRepository.update(courseId, {
            average_rating: average,
            total_reviews: total,
        });
    }

    /**
     * Get review statistics for a course
     */
    async getReviewStats(courseId: string): Promise<{
        average: number;
        total: number;
        distribution: { [key: number]: number };
    }> {
        const reviews = await this.reviewRepository.find({
            where: { course_id: courseId },
        });

        const total = reviews.length;
        const average = total > 0
            ? reviews.reduce((sum, r) => sum + r.rating, 0) / total
            : 0;

        const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
        reviews.forEach(review => {
            distribution[review.rating]++;
        });

        return {
            average: Math.round(average * 10) / 10,
            total,
            distribution,
        };
    }
}
