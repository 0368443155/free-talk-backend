import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GetLessonMaterialsQuery } from '../queries/get-lesson-materials.query';
import { Lesson } from '../../entities/lesson.entity';
import { LessonMaterial } from '../../entities/lesson-material.entity';

@Injectable()
@QueryHandler(GetLessonMaterialsQuery)
export class GetLessonMaterialsHandler implements IQueryHandler<GetLessonMaterialsQuery> {
  private readonly logger = new Logger(GetLessonMaterialsHandler.name);

  constructor(
    @InjectRepository(Lesson)
    private readonly lessonRepository: Repository<Lesson>,
  ) {}

  async execute(query: GetLessonMaterialsQuery): Promise<LessonMaterial[]> {
    this.logger.log(`Getting materials for lesson ${query.lessonId}`);

    const lesson = await this.lessonRepository.findOne({
      where: { id: query.lessonId },
      relations: ['materials'],
    });

    if (!lesson) {
      throw new NotFoundException(`Lesson with ID ${query.lessonId} not found`);
    }

    // Sort by display_order
    return lesson.materials.sort((a, b) => a.display_order - b.display_order);
  }
}

