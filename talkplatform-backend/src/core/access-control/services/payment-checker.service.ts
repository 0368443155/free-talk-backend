import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../../users/user.entity';
import { AccessValidationResult } from '../interfaces/access-validator.interface';

@Injectable()
export class PaymentCheckerService {
  private readonly logger = new Logger(PaymentCheckerService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  /**
   * Check if user has sufficient credits/payment
   */
  async check(
    userId: string,
    roomId: string,
    requiredCredits: number = 0,
  ): Promise<AccessValidationResult> {
    try {
      if (requiredCredits === 0) {
        return {
          granted: true,
          metadata: { requiredCredits: 0 },
        };
      }

      const user = await this.userRepository.findOne({
        where: { id: userId },
      });

      if (!user) {
        return {
          granted: false,
          reason: 'User not found',
        };
      }

      if (user.credit_balance < requiredCredits) {
        return {
          granted: false,
          reason: `Insufficient credits. Required: ${requiredCredits}, Available: ${user.credit_balance}`,
          metadata: {
            requiredCredits,
            availableCredits: user.credit_balance,
          },
        };
      }

      return {
        granted: true,
        metadata: {
          requiredCredits,
          availableCredits: user.credit_balance,
        },
      };
    } catch (error) {
      this.logger.error(`Failed to check payment for user ${userId} in room ${roomId}:`, error);
      return {
        granted: false,
        reason: 'Error checking payment',
      };
    }
  }
}

