import { Injectable, Logger, ForbiddenException, BadRequestException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { CreateCourseCommand } from '../commands/create-course.command';
import { CourseRepository } from '../../infrastructure/repositories/course.repository';
import { CourseAggregate } from '../../domain/course.aggregate';
import { Course, CourseStatus, PriceType } from '../../entities/course.entity';
import { User, UserRole } from '../../../../users/user.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
@CommandHandler(CreateCourseCommand)
export class CreateCourseHandler implements ICommandHandler<CreateCourseCommand> {
  private readonly logger = new Logger(CreateCourseHandler.name);

  constructor(
    private readonly courseRepository: CourseRepository,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async execute(command: CreateCourseCommand): Promise<Course> {
    this.logger.log(`Creating course for teacher: ${command.teacherId}`);

    // Validate teacher
    const teacher = await this.userRepository.findOne({
      where: { id: command.teacherId },
    });

    if (!teacher) {
      throw new ForbiddenException('User not found');
    }

    if (teacher.role !== UserRole.TEACHER && teacher.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Only teachers and admins can create courses');
    }

    // Validate pricing
    if (command.priceType === PriceType.PER_SESSION) {
      if (!command.pricePerSession || command.pricePerSession < 1) {
        throw new BadRequestException('Price per session must be at least $1.00');
      }
    } else if (command.priceType === PriceType.FULL_COURSE) {
      if (!command.priceFullCourse || command.priceFullCourse < 1) {
        throw new BadRequestException('Full course price must be at least $1.00');
      }
    }

    // Create course entity
    const course = new Course();
    course.id = uuidv4();
    course.teacher_id = command.teacherId;
    course.title = command.title;
    course.description = command.description ?? null as any;
    course.duration_hours = command.durationHours || 0;
    course.total_sessions = 0;
    course.price_type = command.priceType || PriceType.PER_SESSION;
    course.price_per_session = command.pricePerSession ?? null as any;
    course.price_full_course = command.priceFullCourse ?? null as any;
    course.language = command.language ?? null as any;
    course.level = command.level ?? null as any;
    course.category = command.category ?? null as any;
    course.tags = command.tags || [];
    course.status = CourseStatus.DRAFT;
    course.is_published = false;
    course.max_students = command.maxStudents || 20;
    course.current_students = 0;

    // Generate affiliate code
    course.affiliate_code = this.generateAffiliateCode();

    // Create aggregate
    const courseAggregate = new CourseAggregate(course);

    // Save course
    const savedCourse = await this.courseRepository.save(courseAggregate);

    this.logger.log(`Course ${savedCourse.id} created successfully`);

    return savedCourse.entity;
  }

  private generateAffiliateCode(): string {
    return `AFF${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
  }
}

