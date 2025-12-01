import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UpdateLessonCommand } from '../commands/update-lesson.command';
import { Lesson } from '../../entities/lesson.entity';
import { CourseSession } from '../../entities/course-session.entity';

@Injectable()
@CommandHandler(UpdateLessonCommand)
export class UpdateLessonHandler implements ICommandHandler<UpdateLessonCommand> {
  private readonly logger = new Logger(UpdateLessonHandler.name);

  constructor(
    @InjectRepository(Lesson)
    private readonly lessonRepository: Repository<Lesson>,
    @InjectRepository(CourseSession)
    private readonly sessionRepository: Repository<CourseSession>,
  ) {}

  async execute(command: UpdateLessonCommand): Promise<Lesson> {
    this.logger.log(`Updating lesson ${command.lessonId} by teacher ${command.teacherId}`);

    // Load lesson with session and course relations
    const lesson = await this.lessonRepository.findOne({
      where: { id: command.lessonId },
      relations: ['session', 'session.course'],
    });

    if (!lesson) {
      throw new NotFoundException('Lesson not found');
    }

    // Verify ownership
    if (lesson.session.course.teacher_id !== command.teacherId) {
      throw new ForbiddenException('You can only update lessons of your own courses');
    }

    // Update lesson properties
    if (command.dto.title !== undefined) lesson.title = command.dto.title;
    if (command.dto.description !== undefined) lesson.description = command.dto.description;
    if (command.dto.scheduled_date !== undefined) {
      lesson.scheduled_date = new Date(command.dto.scheduled_date);
    }
    if (command.dto.start_time !== undefined) lesson.start_time = command.dto.start_time;
    if (command.dto.end_time !== undefined) lesson.end_time = command.dto.end_time;

    // Recalculate duration if times are updated
    if (command.dto.start_time || command.dto.end_time) {
      const startTime = command.dto.start_time || lesson.start_time;
      const endTime = command.dto.end_time || lesson.end_time;

      if (endTime <= startTime) {
        throw new BadRequestException('End time must be after start time');
      }

      const duration = this.calculateDurationMinutes(startTime, endTime);
      if (duration <= 0) {
        throw new BadRequestException('Invalid duration calculated');
      }

      lesson.duration_minutes = duration;
    }

    // Save changes
    const updatedLesson = await this.lessonRepository.save(lesson);

    this.logger.log(`Lesson ${command.lessonId} updated successfully`);

    return updatedLesson;
  }

  private calculateDurationMinutes(startTime: string, endTime: string): number {
    const [startHours, startMinutes] = startTime.split(':').map(Number);
    const [endHours, endMinutes] = endTime.split(':').map(Number);

    const startTotalMinutes = startHours * 60 + startMinutes;
    const endTotalMinutes = endHours * 60 + endMinutes;

    return endTotalMinutes - startTotalMinutes;
  }
}


