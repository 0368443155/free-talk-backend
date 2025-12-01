import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CourseEnrollment, EnrollmentStatus } from '../../../features/courses/entities/enrollment.entity';
import { AccessValidationResult } from '../interfaces/access-validator.interface';

@Injectable()
export class EnrollmentCheckerService {
  private readonly logger = new Logger(EnrollmentCheckerService.name);

  constructor(
    @InjectRepository(CourseEnrollment)
    private readonly enrollmentRepository: Repository<CourseEnrollment>,
  ) {}

  /**
   * Check if user is enrolled in a course/lesson
   */
  async check(userId: string, roomId: string): Promise<AccessValidationResult> {
    try {
      // This would need to be adapted based on how roomId maps to course/lesson
      // For now, we'll check if there's an enrollment record
      const enrollment = await this.enrollmentRepository.findOne({
        where: {
          user_id: userId,
          // course_id or lesson_id would need to be extracted from roomId
          status: EnrollmentStatus.ACTIVE,
        },
      });

      if (!enrollment) {
        return {
          granted: false,
          reason: 'User is not enrolled in this course/lesson',
        };
      }

      return {
        granted: true,
        metadata: {
          enrollmentId: enrollment.id,
          enrollmentType: enrollment.enrollment_type,
        },
      };
    } catch (error) {
      this.logger.error(`Failed to check enrollment for user ${userId} in room ${roomId}:`, error);
      return {
        granted: false,
        reason: 'Error checking enrollment',
      };
    }
  }

  /**
   * Check if user is enrolled in a specific course
   */
  async checkCourseEnrollment(userId: string, courseId: string): Promise<boolean> {
    const enrollment = await this.enrollmentRepository.findOne({
      where: {
        user_id: userId,
        course_id: courseId,
        status: EnrollmentStatus.ACTIVE,
      },
    });

    return !!enrollment;
  }

  /**
   * Check if user is enrolled in a specific lesson
   */
  async checkLessonEnrollment(userId: string, lessonId: string): Promise<boolean> {
    // Check if user is enrolled in the course that contains this lesson
    // This would require joining with lesson table
    return false; // Placeholder
  }
}

