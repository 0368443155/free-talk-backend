import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GetCourseMeetingsQuery } from '../queries/get-course-meetings.query';
import { Course } from '../../entities/course.entity';
import { Meeting } from '../../../meeting/entities/meeting.entity';

@Injectable()
@QueryHandler(GetCourseMeetingsQuery)
export class GetCourseMeetingsHandler implements IQueryHandler<GetCourseMeetingsQuery> {
  private readonly logger = new Logger(GetCourseMeetingsHandler.name);

  constructor(
    @InjectRepository(Course)
    private readonly courseRepository: Repository<Course>,
    @InjectRepository(Meeting)
    private readonly meetingRepository: Repository<Meeting>,
  ) {}

  async execute(query: GetCourseMeetingsQuery): Promise<Meeting[]> {
    this.logger.log(`Getting meetings for course ${query.courseId}`);

    // Verify course exists
    const course = await this.courseRepository.findOne({
      where: { id: query.courseId },
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    // Get all meetings for this course
    const meetings = await this.meetingRepository.find({
      where: { course_id: query.courseId },
      relations: ['host', 'lesson', 'session'],
      order: { scheduled_at: 'ASC' },
    });

    this.logger.log(`Found ${meetings.length} meetings for course ${query.courseId}`);
    return meetings;
  }
}

