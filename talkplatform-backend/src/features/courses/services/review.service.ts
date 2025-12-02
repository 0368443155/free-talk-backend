import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Review } from '../entities/review.entity';
import { Course } from '../entities/course.entity';
import { CourseEnrollment, EnrollmentStatus } from '../entities/enrollment.entity';
import { SessionPurchase, PurchaseStatus } from '../entities/session-purchase.entity';
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
        @InjectRepository(SessionPurchase)
        private sessionPurchaseRepository: Repository<SessionPurchase>,
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

        // Check if user has purchased the course (either enrolled or purchased at least one session)
        const enrollment = await this.enrollmentRepository.findOne({
            where: {
                course_id: courseId,
                user_id: userId,
                status: EnrollmentStatus.ACTIVE,
            },
        });

        // If not enrolled, check if user has purchased any session
        if (!enrollment) {
            const sessionPurchase = await this.sessionPurchaseRepository.findOne({
                where: {
                    course_id: courseId,
                    user_id: userId,
                    status: PurchaseStatus.ACTIVE,
                },
            });

            if (!sessionPurchase) {
                throw new ForbiddenException('You must purchase this course or at least one session to leave a review');
            }
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
     * Get all reviews for a course (filtered by visibility rules)
     * - For free courses: hide reviews where is_hidden = true
     * - For paid courses: show all reviews (is_hidden is ignored)
     * - Rating is always included in stats regardless of visibility
     */
    async getCourseReviews(courseId: string, userId?: string): Promise<Review[]> {
        const course = await this.courseRepository.findOne({ where: { id: courseId } });
        if (!course) {
            throw new NotFoundException('Course not found');
        }

        // Check if course is free (price_full_course = 0 and price_per_session = 0 or null)
        const isFreeCourse = (!course.price_full_course || course.price_full_course === 0) &&
                             (!course.price_per_session || course.price_per_session === 0);

        const queryBuilder = this.reviewRepository
            .createQueryBuilder('review')
            .leftJoinAndSelect('review.user', 'user')
            .where('review.course_id = :courseId', { courseId });

        // For free courses, filter out hidden reviews
        // For paid courses, show all reviews
        if (isFreeCourse) {
            queryBuilder.andWhere('review.is_hidden = :isHidden', { isHidden: false });
        }

        // If user is the teacher, show all reviews (including hidden ones)
        if (userId && course.teacher_id === userId) {
            // Remove the is_hidden filter for teacher
            return this.reviewRepository.find({
                where: { course_id: courseId },
                relations: ['user'],
                order: { created_at: 'DESC' },
            });
        }

        return queryBuilder
            .orderBy('review.created_at', 'DESC')
            .getMany();
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
     * Note: Rating calculation includes ALL reviews (even hidden ones) for accurate stats
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
     * Note: Stats include ALL reviews (even hidden ones) for accurate rating
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

    /**
     * Hide or show a review (only for free courses, only by course teacher)
     */
    async toggleReviewVisibility(
        reviewId: string,
        teacherId: string,
        isHidden: boolean,
    ): Promise<Review> {
        const review = await this.reviewRepository.findOne({
            where: { id: reviewId },
            relations: ['course'],
        });

        if (!review) {
            throw new NotFoundException('Review not found');
        }

        // Check if user is the course teacher
        if (review.course.teacher_id !== teacherId) {
            throw new ForbiddenException('Only the course teacher can hide/show reviews');
        }

        // Check if course is free
        const course = review.course;
        const isFreeCourse = (!course.price_full_course || course.price_full_course === 0) &&
                             (!course.price_per_session || course.price_per_session === 0);

        if (!isFreeCourse) {
            throw new ForbiddenException('Cannot hide reviews for paid courses');
        }

        review.is_hidden = isHidden;
        return this.reviewRepository.save(review);
    }
}
