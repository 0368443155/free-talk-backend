import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere } from 'typeorm';
import { Course, CourseStatus, CourseCategory, CourseLevel } from '../../entities/course.entity';
import { CourseSession } from '../../entities/course-session.entity';
import { CourseAggregate } from '../../domain/course.aggregate';

export interface CourseFilters {
  teacherId?: string;
  status?: CourseStatus;
  category?: CourseCategory;
  level?: CourseLevel;
  language?: string;
  isPublished?: boolean;
  search?: string;
}

export interface PaginationOptions {
  page: number;
  limit: number;
}

export interface FindWithFiltersResult {
  courses: CourseAggregate[];
  total: number;
}

@Injectable()
export class CourseRepository {
  constructor(
    @InjectRepository(Course)
    private readonly courseRepository: Repository<Course>,
    @InjectRepository(CourseSession)
    private readonly sessionRepository: Repository<CourseSession>,
  ) {}

  /**
   * Find course by ID
   */
  async findById(courseId: string, includeSessions = false): Promise<CourseAggregate | null> {
    const course = await this.courseRepository.findOne({
      where: { id: courseId },
    });

    if (!course) {
      return null;
    }

    let sessions: CourseSession[] = [];
    if (includeSessions) {
      sessions = await this.sessionRepository.find({
        where: { course_id: courseId },
        relations: ['lessons'],
        order: { session_number: 'ASC' },
      });
    }

    return new CourseAggregate(course, sessions);
  }

  /**
   * Find courses with filters and pagination
   */
  async findWithFilters(
    filters: CourseFilters,
    pagination: PaginationOptions,
  ): Promise<FindWithFiltersResult> {
    const queryBuilder = this.courseRepository.createQueryBuilder('course');

    // Apply filters
    if (filters.teacherId) {
      queryBuilder.andWhere('course.teacher_id = :teacherId', { teacherId: filters.teacherId });
    }

    if (filters.status) {
      queryBuilder.andWhere('course.status = :status', { status: filters.status });
    }

    if (filters.category) {
      queryBuilder.andWhere('course.category = :category', { category: filters.category });
    }

    if (filters.level) {
      queryBuilder.andWhere('course.level = :level', { level: filters.level });
    }

    if (filters.language) {
      queryBuilder.andWhere('course.language = :language', { language: filters.language });
    }

    if (filters.isPublished !== undefined) {
      queryBuilder.andWhere('course.is_published = :isPublished', {
        isPublished: filters.isPublished,
      });
    }

    if (filters.search) {
      queryBuilder.andWhere(
        '(course.title LIKE :search OR course.description LIKE :search)',
        { search: `%${filters.search}%` },
      );
    }

    // Get total count
    const total = await queryBuilder.getCount();

    // Apply pagination
    const skip = (pagination.page - 1) * pagination.limit;
    queryBuilder.skip(skip).take(pagination.limit);

    // Order by created date
    queryBuilder.orderBy('course.created_at', 'DESC');

    // Execute query
    const courses = await queryBuilder.getMany();

    // Convert to aggregates
    const aggregates = courses.map(course => new CourseAggregate(course));

    return {
      courses: aggregates,
      total,
    };
  }

  /**
   * Save course aggregate
   */
  async save(courseAggregate: CourseAggregate): Promise<CourseAggregate> {
    const course = await this.courseRepository.save(courseAggregate.entity);
    return new CourseAggregate(course, courseAggregate.sessionList);
  }

  /**
   * Delete course
   */
  async delete(courseId: string): Promise<void> {
    await this.courseRepository.delete(courseId);
  }

  /**
   * Check if course exists
   */
  async exists(courseId: string): Promise<boolean> {
    const count = await this.courseRepository.count({ where: { id: courseId } });
    return count > 0;
  }
}

