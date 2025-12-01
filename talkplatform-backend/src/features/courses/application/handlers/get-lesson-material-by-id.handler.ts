import { Injectable, Logger } from '@nestjs/common';
import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GetLessonMaterialByIdQuery } from '../queries/get-lesson-material-by-id.query';
import { LessonMaterial } from '../../entities/lesson-material.entity';

@Injectable()
@QueryHandler(GetLessonMaterialByIdQuery)
export class GetLessonMaterialByIdHandler implements IQueryHandler<GetLessonMaterialByIdQuery> {
  private readonly logger = new Logger(GetLessonMaterialByIdHandler.name);

  constructor(
    @InjectRepository(LessonMaterial)
    private readonly lessonMaterialRepository: Repository<LessonMaterial>,
  ) {}

  async execute(query: GetLessonMaterialByIdQuery): Promise<LessonMaterial | null> {
    this.logger.log(`Getting material ${query.materialId}`);

    return this.lessonMaterialRepository.findOne({
      where: { id: query.materialId },
      relations: ['lesson'],
    });
  }
}

