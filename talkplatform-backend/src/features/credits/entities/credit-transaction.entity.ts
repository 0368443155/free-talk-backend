import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';
import { User } from '../../../users/user.entity';
import { Meeting } from '../../meeting/entities/meeting.entity';

export enum TransactionType {
  PURCHASE = 'purchase',        // User buys credits
  DEDUCTION = 'deduction',      // Credits spent on classes/materials
  REFUND = 'refund',           // Credits refunded
  DONATION = 'donation',        // Tips to teachers
  EARNING = 'earning',         // Teacher earnings
  AFFILIATE_BONUS = 'affiliate_bonus' // Affiliate commissions
}

export enum TransactionStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  FAILED = 'failed',
  REFUNDED = 'refunded'
}

export enum PaymentProvider {
  STRIPE = 'stripe',
  PAYPAL = 'paypal',
  VNPAY = 'vnpay',
  INTERNAL = 'internal'  // For earnings, affiliates, etc.
}

@Entity('credit_transactions')
@Index(['user_id', 'created_at'])
@Index(['transaction_type', 'status'])
export class CreditTransaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { nullable: false })
  user: User;

  @Column({ type: 'uuid' })
  user_id: string;

  @Column({
    type: 'enum',
    enum: TransactionType
  })
  transaction_type: TransactionType;

  @Column({
    type: 'enum',
    enum: TransactionStatus,
    default: TransactionStatus.PENDING
  })
  status: TransactionStatus;

  @Column({ name: 'amount', type: 'decimal', precision: 10, scale: 2 })
  credit_amount: number;

  // Note: These columns may not exist in old database schema
  // Use @Column with { select: false } or make them optional
  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true, select: false })
  usd_amount?: number;

  @Column({ type: 'varchar', length: 3, nullable: true, select: false })
  currency?: string; // USD, VND, etc.

  @Column({ type: 'varchar', length: 1000, nullable: true })
  description: string;

  // Payment provider info
  @Column({
    type: 'enum',
    enum: PaymentProvider,
    nullable: true
  })
  payment_provider: PaymentProvider;

  @Column({ type: 'varchar', length: 500, nullable: true })
  external_transaction_id: string; // Stripe payment intent, PayPal order ID, etc.

  @Column({ type: 'json', nullable: true })
  payment_metadata: any; // Additional payment info

  // Related entities
  @ManyToOne(() => Meeting, { nullable: true })
  meeting: Meeting;

  @Column({ type: 'uuid', nullable: true })
  meeting_id: string;

  @ManyToOne(() => User, { nullable: true })
  teacher: User; // For teacher earnings

  @Column({ type: 'uuid', nullable: true })
  teacher_id: string;

  // Note: These columns may not exist in old database schema
  // Use { select: false } to exclude from default queries
  @Column({ type: 'varchar', length: 200, nullable: true, select: false })
  affiliate_code?: string;

  // Revenue sharing info
  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true, select: false })
  platform_fee_percentage?: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true, select: false })
  platform_fee_amount?: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true, select: false })
  teacher_amount?: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true, select: false })
  balance_before?: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true, select: false })
  balance_after?: number;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @Column({ type: 'timestamp', nullable: true })
  processed_at: Date;
}