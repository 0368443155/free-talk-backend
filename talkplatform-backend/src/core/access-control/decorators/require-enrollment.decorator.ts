import { UseGuards, applyDecorators } from '@nestjs/common';
import { EnrollmentGuard } from '../guards/enrollment.guard';

/**
 * Decorator to require enrollment for a route
 */
export const RequireEnrollment = () => applyDecorators(UseGuards(EnrollmentGuard));

