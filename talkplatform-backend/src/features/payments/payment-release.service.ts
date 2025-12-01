import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { CourseSession, SessionStatus } from '../courses/entities/course-session.entity';
import { SessionPurchase, PurchaseStatus } from '../courses/entities/session-purchase.entity';
import { PaymentHold, HoldStatus } from '../courses/entities/payment-hold.entity';
import { AttendanceRecord } from '../courses/entities/attendance-record.entity';
import { Transaction, TransactionType, TransactionStatus } from './entities/transaction.entity';
import { User } from '../../users/user.entity';

@Injectable()
export class PaymentReleaseService {
  private readonly logger = new Logger(PaymentReleaseService.name);

  constructor(
    @InjectRepository(CourseSession)
    private sessionRepository: Repository<CourseSession>,
    @InjectRepository(SessionPurchase)
    private purchaseRepository: Repository<SessionPurchase>,
    @InjectRepository(PaymentHold)
    private holdRepository: Repository<PaymentHold>,
    @InjectRepository(AttendanceRecord)
    private attendanceRepository: Repository<AttendanceRecord>,
    @InjectRepository(Transaction)
    private transactionRepository: Repository<Transaction>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectDataSource()
    private dataSource: DataSource,
  ) {}

  /**
   * Cron job: Auto-release payments every 5 minutes
   */
  @Cron('*/5 * * * *')
  async autoReleasePayments() {
    this.logger.log('🔄 Running auto-release payments cron job...');

    // Find completed sessions with pending payment holds
    const completedSessions = await this.sessionRepository.find({
      where: { status: SessionStatus.COMPLETED },
      relations: ['course'],
    });

    this.logger.log(`Found ${completedSessions.length} completed sessions`);

    for (const session of completedSessions) {
      try {
        await this.processSessionPayments(session);
      } catch (error) {
        this.logger.error(
          `Error processing session ${session.id}: ${error.message}`,
          error.stack,
        );
      }
    }

    this.logger.log('✅ Auto-release payments completed');
  }

  /**
   * Process payments for a completed session
   */
  private async processSessionPayments(session: CourseSession) {
    this.logger.log(`Processing payments for session ${session.id}`);

    // Find all purchases for this session
    const purchases = await this.purchaseRepository.find({
      where: {
        session_id: session.id,
        status: PurchaseStatus.ACTIVE,
      },
    });

    this.logger.log(`Found ${purchases.length} purchases to process`);

    for (const purchase of purchases) {
      try {
        // Find payment hold
        const hold = await this.holdRepository.findOne({
          where: {
            session_purchase_id: purchase.id,
            status: HoldStatus.HELD,
          },
        });

        if (!hold) {
          this.logger.warn(`No payment hold found for purchase ${purchase.id}`);
          continue;
        }

        // Find attendance record
        const attendance = await this.attendanceRepository.findOne({
          where: {
            session_id: session.id,
            user_id: purchase.user_id,
          },
        });

        const attendancePercentage = attendance?.attendance_percentage || 0;

        this.logger.log(
          `Purchase ${purchase.id}: attendance=${attendancePercentage}%`,
        );

        // Decide: release or refund
        if (attendancePercentage >= 20) {
          await this.releaseToTeacher(hold, session, attendancePercentage);
        } else {
          await this.refundToStudent(hold, session, attendancePercentage);
        }
      } catch (error) {
        this.logger.error(
          `Error processing purchase ${purchase.id}: ${error.message}`,
          error.stack,
        );
      }
    }
  }

  /**
   * Release payment to teacher
   */
  private async releaseToTeacher(
    hold: PaymentHold,
    session: CourseSession,
    attendancePercentage: number,
  ) {
    this.logger.log(`Releasing payment to teacher for hold ${hold.id}`);

    await this.dataSource.transaction(async (manager) => {
      // Calculate commission
      const teacher = await manager.findOne(User, {
        where: { id: hold.teacher_id },
      });

      // Commission: 30% if referred, 0% otherwise
      // Note: User entity has 'refferrer_id' field (with 2 'r')
      const commissionRate = teacher?.refferrer_id ? 0.3 : 0;
      const platformFee = hold.amount * commissionRate;
      const teacherAmount = hold.amount - platformFee;

      // Update teacher balance
      await manager.increment(
        User,
        { id: hold.teacher_id },
        'credit_balance',
        teacherAmount,
      );

      // Create transaction for teacher
      const teacherBalanceBefore = teacher?.credit_balance || 0;
      await manager.save(Transaction, {
        user_id: hold.teacher_id,
        type: TransactionType.PAYMENT_RELEASE,
        amount: teacherAmount,
        balance_before: teacherBalanceBefore,
        balance_after: teacherBalanceBefore + teacherAmount,
        status: TransactionStatus.COMPLETED,
        reference_type: 'payment_hold',
        reference_id: hold.id,
        description: `Payment released for session ${session.title || session.id}`,
        metadata: {
          session_id: session.id,
          course_id: session.course_id,
          attendance_percentage: attendancePercentage,
          original_amount: hold.amount,
          platform_fee: platformFee,
          commission_rate: commissionRate,
        },
        completed_at: new Date(),
      });

      // Create commission transaction if applicable
      if (platformFee > 0) {
        await manager.save(Transaction, {
          user_id: hold.teacher_id,
          type: TransactionType.COMMISSION,
          amount: -platformFee,
          balance_before: teacherBalanceBefore + teacherAmount,
          balance_after: teacherBalanceBefore + teacherAmount,
          status: TransactionStatus.COMPLETED,
          reference_type: 'payment_hold',
          reference_id: hold.id,
          description: `Platform commission (${commissionRate * 100}%)`,
          metadata: {
            commission_rate: commissionRate,
            original_amount: hold.amount,
          },
          completed_at: new Date(),
        });
      }

      // Update payment hold
      hold.status = HoldStatus.RELEASED;
      hold.released_at = new Date();
      hold.release_percentage = attendancePercentage;
      hold.notes = `Released to teacher (attendance: ${attendancePercentage}%)`;
      await manager.save(PaymentHold, hold);

      this.logger.log(
        `✅ Payment released: teacher=${hold.teacher_id}, amount=${teacherAmount}, fee=${platformFee}`,
      );
    });
  }

  /**
   * Refund payment to student
   */
  private async refundToStudent(
    hold: PaymentHold,
    session: CourseSession,
    attendancePercentage: number,
  ) {
    this.logger.log(`Refunding payment to student for hold ${hold.id}`);

    await this.dataSource.transaction(async (manager) => {
      // Refund to student
      const student = await manager.findOne(User, {
        where: { id: hold.student_id },
      });

      await manager.increment(
        User,
        { id: hold.student_id },
        'credit_balance',
        hold.amount,
      );

      // Create refund transaction
      const studentBalanceBefore = student?.credit_balance || 0;
      await manager.save(Transaction, {
        user_id: hold.student_id,
        type: TransactionType.REFUND,
        amount: hold.amount,
        balance_before: studentBalanceBefore,
        balance_after: studentBalanceBefore + hold.amount,
        status: TransactionStatus.COMPLETED,
        reference_type: 'payment_hold',
        reference_id: hold.id,
        description: `Refund for session ${session.title || session.id} (low attendance)`,
        metadata: {
          session_id: session.id,
          course_id: session.course_id,
          attendance_percentage: attendancePercentage,
          reason: 'attendance_below_threshold',
        },
        completed_at: new Date(),
      });

      // Update payment hold
      hold.status = HoldStatus.REFUNDED;
      hold.released_at = new Date();
      hold.release_percentage = attendancePercentage;
      hold.notes = `Refunded to student (attendance: ${attendancePercentage}%)`;
      await manager.save(PaymentHold, hold);

      // Update session purchase
      await manager.update(SessionPurchase, { id: hold.session_purchase_id }, {
        refund_amount: hold.amount,
        status: PurchaseStatus.CANCELLED, // Use CANCELLED as refunded status
      });

      this.logger.log(
        `✅ Payment refunded: student=${hold.student_id}, amount=${hold.amount}`,
      );
    });
  }
}

