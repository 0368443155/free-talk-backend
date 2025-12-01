import { Injectable, Logger } from '@nestjs/common';
import { RoomConfig } from '../../room/interfaces/room-config.interface';
import { AccessValidationResult } from '../interfaces/access-validator.interface';
import { EnrollmentCheckerService } from './enrollment-checker.service';
import { PaymentCheckerService } from './payment-checker.service';
import { TimeBasedAccessService } from './time-based-access.service';
import { CapacityCheckerService } from './capacity-checker.service';
import { RoleBasedAccessService } from './role-based-access.service';

@Injectable()
export class AccessValidatorService {
  private readonly logger = new Logger(AccessValidatorService.name);

  constructor(
    private readonly enrollmentChecker: EnrollmentCheckerService,
    private readonly paymentChecker: PaymentCheckerService,
    private readonly timeBasedAccess: TimeBasedAccessService,
    private readonly capacityChecker: CapacityCheckerService,
    private readonly roleBasedAccess: RoleBasedAccessService,
  ) {}

  /**
   * Validate room access based on room configuration
   */
  async validateRoomAccess(
    userId: string,
    roomId: string,
    roomConfig: RoomConfig,
  ): Promise<AccessValidationResult> {
    const checks: Promise<AccessValidationResult>[] = [];

    // Enrollment check
    if (roomConfig.requiresEnrollment) {
      checks.push(this.enrollmentChecker.check(userId, roomId));
    }

    // Payment check
    if (roomConfig.requiresPayment) {
      // Get required credits from room config or meeting entity
      const requiredCredits = roomConfig.accessControl.maxParticipants > 0 ? 1 : 0;
      checks.push(this.paymentChecker.check(userId, roomId, requiredCredits));
    }

    // Time restriction check
    if (roomConfig.timeRestricted) {
      checks.push(this.timeBasedAccess.check(roomId));
    }

    // Capacity check
    checks.push(
      this.capacityChecker.check(roomId, roomConfig.maxParticipants),
    );

    // Role-based access check
    if (roomConfig.accessControl.allowedRoles && roomConfig.accessControl.allowedRoles.length > 0) {
      // Convert string roles to UserRole enum
      const requiredRoles = roomConfig.accessControl.allowedRoles as any[];
      checks.push(this.roleBasedAccess.check(userId, requiredRoles));
    }

    // Run all checks
    const results = await Promise.all(checks);

    // Aggregate results
    return this.aggregateResults(results);
  }

  /**
   * Aggregate multiple validation results
   */
  private aggregateResults(results: AccessValidationResult[]): AccessValidationResult {
    // If any check fails, access is denied
    const failedCheck = results.find((result) => !result.granted);
    if (failedCheck) {
      return failedCheck;
    }

    // All checks passed
    return {
      granted: true,
      metadata: {
        checks: results.length,
        allPassed: true,
      },
    };
  }
}

