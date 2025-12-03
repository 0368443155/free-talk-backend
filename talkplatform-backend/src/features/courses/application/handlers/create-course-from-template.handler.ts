import { CommandHandler, ICommandHandler, CommandBus } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException, Logger } from '@nestjs/common';
import { CreateCourseFromTemplateCommand } from '../commands/create-course-from-template.command';
import { CourseTemplate } from '../../entities/course-template.entity';
import { TemplateUsage } from '../../entities/template-usage.entity';
import { Course, PriceType } from '../../entities/course.entity';
import { CreateCourseCommand } from '../commands/create-course.command';
import { AddSessionCommand } from '../commands/add-session.command';

@CommandHandler(CreateCourseFromTemplateCommand)
export class CreateCourseFromTemplateHandler
  implements ICommandHandler<CreateCourseFromTemplateCommand>
{
  private readonly logger = new Logger(CreateCourseFromTemplateHandler.name);

  constructor(
    @InjectRepository(CourseTemplate)
    private readonly templateRepository: Repository<CourseTemplate>,
    @InjectRepository(TemplateUsage)
    private readonly usageRepository: Repository<TemplateUsage>,
    private readonly commandBus: CommandBus,
  ) {}

  async execute(command: CreateCourseFromTemplateCommand): Promise<Course> {
    // 1. Get template
    const template = await this.templateRepository.findOne({
      where: { id: command.templateId },
    });

    if (!template) {
      throw new NotFoundException('Template not found');
    }

    // 2. Create course using existing CreateCourseCommand
    const createCourseCommand = new CreateCourseCommand(
      command.userId,
      command.courseData.title,
      command.courseData.description || template.description || '',
      template.totalDurationHours || 0,
      command.courseData.pricePerSession ? PriceType.PER_SESSION : PriceType.FULL_COURSE,
      command.courseData.pricePerSession || template.suggestedPriceSession,
      command.courseData.priceFullCourse || template.suggestedPriceFull,
      template.language || 'en',
      template.level as any,
      template.category as any,
      template.tags || [],
      command.courseData.maxStudents || 30,
    );

    const course = await this.commandBus.execute<CreateCourseCommand, Course>(
      createCourseCommand,
    );

    // 3. Create sessions from template structure (deep clone)
    const startDate = new Date(command.courseData.startDate);

    for (const sessionTemplate of template.sessionStructure) {
      // Calculate session date based on sessions per week
      const sessionDate = new Date(startDate);
      const sessionsPerWeek = template.sessionsPerWeek || 2;
      const weeksToAdd = Math.floor((sessionTemplate.sessionNumber - 1) / sessionsPerWeek);
      const daysToAdd = ((sessionTemplate.sessionNumber - 1) % sessionsPerWeek) * 3; // 3 days apart
      sessionDate.setDate(sessionDate.getDate() + weeksToAdd * 7 + daysToAdd);

      // Calculate end time
      const startTime = '14:00'; // Default start time
      const endTime = this.calculateEndTime(startTime, sessionTemplate.durationMinutes);

      // Create session using existing AddSessionCommand
      const addSessionCommand = new AddSessionCommand(
        course.id,
        command.userId,
        {
          session_number: sessionTemplate.sessionNumber,
          title: sessionTemplate.title,
          description: sessionTemplate.description || '',
          scheduled_date: sessionDate.toISOString().split('T')[0],
          start_time: startTime,
          end_time: endTime,
          duration_minutes: sessionTemplate.durationMinutes,
        },
      );

      await this.commandBus.execute(addSessionCommand);
    }

    // 4. Increment template usage count
    await this.templateRepository.increment({ id: template.id }, 'usageCount', 1);

    // 5. Track usage
    const usage = this.usageRepository.create({
      templateId: template.id,
      courseId: course.id,
      usedBy: command.userId,
    });
    await this.usageRepository.save(usage);

    this.logger.log(
      `Course ${course.id} created from template ${template.id} by user ${command.userId}`,
    );

    return course;
  }

  private calculateEndTime(startTime: string, durationMinutes: number): string {
    const [hours, minutes] = startTime.split(':').map(Number);
    const totalMinutes = hours * 60 + minutes + durationMinutes;
    const endHours = Math.floor(totalMinutes / 60);
    const endMinutes = totalMinutes % 60;
    return `${String(endHours).padStart(2, '0')}:${String(endMinutes).padStart(2, '0')}`;
  }
}

