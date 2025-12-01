import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaymentHold, HoldStatus } from '../../../features/courses/entities/payment-hold.entity';

@Injectable()
export class PaymentHoldService {
  private readonly logger = new Logger(PaymentHoldService.name);

  constructor(
    @InjectRepository(PaymentHold)
    private readonly paymentHoldRepository: Repository<PaymentHold>,
  ) {}

  /**
   * Create payment hold
   */
  async createHold(
    enrollmentId: string,
    teacherId: string,
    studentId: string,
    amount: number,
  ): Promise<PaymentHold> {
    const hold = this.paymentHoldRepository.create({
      enrollment_id: enrollmentId,
      teacher_id: teacherId,
      student_id: studentId,
      amount: amount,
      status: HoldStatus.HELD,
    });

    return this.paymentHoldRepository.save(hold);
  }

  /**
   * Release payment hold
   */
  async releaseHold(holdId: string): Promise<void> {
    await this.paymentHoldRepository.update(holdId, {
      status: HoldStatus.RELEASED,
      released_at: new Date(),
    });
  }

  /**
   * Cancel payment hold (refund)
   */
  async cancelHold(holdId: string): Promise<void> {
    await this.paymentHoldRepository.update(holdId, {
      status: HoldStatus.REFUNDED,
    });
  }
}

