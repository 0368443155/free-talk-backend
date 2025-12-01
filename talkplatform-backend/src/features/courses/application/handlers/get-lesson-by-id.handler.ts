import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GetLessonByIdQuery } from '../queries/get-lesson-by-id.query';
import { Lesson } from '../../entities/lesson.entity';

@Injectable()
@QueryHandler(GetLessonByIdQuery)
export class GetLessonByIdHandler implements IQueryHandler<GetLessonByIdQuery> {
  private readonly logger = new Logger(GetLessonByIdHandler.name);

  constructor(
    @InjectRepository(Lesson)
    private readonly lessonRepository: Repository<Lesson>,
  ) {}

  async execute(query: GetLessonByIdQuery): Promise<Lesson> {
    this.logger.log(`Getting lesson ${query.lessonId}`);

    const lesson = await this.lessonRepository.findOne({
      where: { id: query.lessonId },
      relations: ['session', 'session.course', 'materials', 'meeting'],
    });

    if (!lesson) {
      throw new NotFoundException(`Lesson with ID ${query.lessonId} not found`);
    }

    return lesson;
  }
}


