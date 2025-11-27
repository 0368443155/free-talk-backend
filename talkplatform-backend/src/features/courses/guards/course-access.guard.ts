import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { EnrollmentService } from '../enrollment.service';

@Injectable()
export class CourseAccessGuard implements CanActivate {
  constructor(private enrollmentService: EnrollmentService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const lessonId = request.params.lessonId || request.body.lessonId;

    if (!user) {
      throw new ForbiddenException('Authentication required');
    }

    if (!lessonId) {
      throw new ForbiddenException('Lesson ID required');
    }

    const access = await this.enrollmentService.hasAccessToLesson(
      user.userId || user.id,
      lessonId,
    );

    if (!access.hasAccess) {
      throw new ForbiddenException(
        access.reason || 'You need to purchase this course to access this lesson',
      );
    }

    return true;
  }
}

