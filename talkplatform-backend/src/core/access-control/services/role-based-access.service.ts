import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserRole } from '../../../users/user.entity';
import { AccessValidationResult } from '../interfaces/access-validator.interface';

@Injectable()
export class RoleBasedAccessService {
  private readonly logger = new Logger(RoleBasedAccessService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  /**
   * Check if user has required role
   */
  async check(
    userId: string,
    requiredRoles: UserRole[],
  ): Promise<AccessValidationResult> {
    try {
      const user = await this.userRepository.findOne({
        where: { id: userId },
      });

      if (!user) {
        return {
          granted: false,
          reason: 'User not found',
        };
      }

      if (!requiredRoles.includes(user.role)) {
        return {
          granted: false,
          reason: `User role ${user.role} is not in required roles: ${requiredRoles.join(', ')}`,
          metadata: {
            userRole: user.role,
            requiredRoles,
          },
        };
      }

      return {
        granted: true,
        metadata: {
          userRole: user.role,
        },
      };
    } catch (error) {
      this.logger.error(`Failed to check role-based access for user ${userId}:`, error);
      return {
        granted: false,
        reason: 'Error checking role-based access',
      };
    }
  }
}

