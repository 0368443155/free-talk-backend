import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AccessValidatorService } from './services/access-validator.service';
import { EnrollmentCheckerService } from './services/enrollment-checker.service';
import { PaymentCheckerService } from './services/payment-checker.service';
import { TimeBasedAccessService } from './services/time-based-access.service';
import { CapacityCheckerService } from './services/capacity-checker.service';
import { RoleBasedAccessService } from './services/role-based-access.service';
import { EnrollmentGuard } from './guards/enrollment.guard';
import { PaymentGuard } from './guards/payment.guard';
import { TimeRestrictionGuard } from './guards/time-restriction.guard';
import { CapacityGuard } from './guards/capacity.guard';
import { CourseEnrollment } from '../../features/courses/entities/enrollment.entity';
import { User } from '../../users/user.entity';
import { Meeting } from '../../features/meeting/entities/meeting.entity';
import { MeetingParticipant } from '../../features/meeting/entities/meeting-participant.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CourseEnrollment,
      User,
      Meeting,
      MeetingParticipant,
    ]),
  ],
  providers: [
    AccessValidatorService,
    EnrollmentCheckerService,
    PaymentCheckerService,
    TimeBasedAccessService,
    CapacityCheckerService,
    RoleBasedAccessService,
    EnrollmentGuard,
    PaymentGuard,
    TimeRestrictionGuard,
    CapacityGuard,
  ],
  exports: [
    AccessValidatorService,
    EnrollmentCheckerService,
    PaymentCheckerService,
    TimeBasedAccessService,
    CapacityCheckerService,
    RoleBasedAccessService,
    EnrollmentGuard,
    PaymentGuard,
    TimeRestrictionGuard,
    CapacityGuard,
  ],
})
export class AccessControlModule {}

