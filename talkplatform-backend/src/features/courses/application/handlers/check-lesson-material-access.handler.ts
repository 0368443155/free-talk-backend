import { Injectable, Logger } from '@nestjs/common';
import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';
import { CheckLessonMaterialAccessQuery } from '../queries/check-lesson-material-access.query';
import { EnrollmentService } from '../../enrollment.service';

@Injectable()
@QueryHandler(CheckLessonMaterialAccessQuery)
export class CheckLessonMaterialAccessHandler
  implements IQueryHandler<CheckLessonMaterialAccessQuery>
{
  private readonly logger = new Logger(CheckLessonMaterialAccessHandler.name);

  constructor(private readonly enrollmentService: EnrollmentService) {}

  async execute(query: CheckLessonMaterialAccessQuery): Promise<boolean> {
    this.logger.log(
      `Checking material access for user ${query.userId} and material ${query.materialId}`,
    );

    return this.enrollmentService.hasAccessToMaterial(query.userId, query.materialId);
  }
}

