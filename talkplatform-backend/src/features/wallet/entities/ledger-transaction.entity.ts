import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  OneToMany,
} from 'typeorm';
import { LedgerEntry } from './ledger-entry.entity';

/**
 * Ledger Transaction Entity
 * 
 * Đại diện cho một giao dịch trong sổ cái kép (Double-Entry Ledger)
 * Mỗi transaction có một transaction_group_id để nhóm các entries cùng một giao dịch
 * Nguyên tắc: Tổng tất cả entries trong một transaction_group phải = 0
 */
@Entity('ledger_transactions')
@Index(['transaction_group_id'])
@Index(['created_at'])
export class LedgerTransaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * Transaction Group ID
   * Nhóm các entries cùng một giao dịch (ví dụ: booking, purchase, refund)
   */
  @Column({ type: 'varchar', length: 100 })
  transaction_group_id: string;

  /**
   * Mô tả giao dịch
   */
  @Column({ type: 'varchar', length: 500 })
  description: string;

  /**
   * Loại giao dịch
   */
  @Column({ type: 'varchar', length: 50 })
  transaction_type: string; // 'booking', 'purchase', 'refund', 'earning', 'withdrawal', etc.

  /**
   * Reference ID (booking_id, purchase_id, etc.)
   */
  @Column({ type: 'uuid', nullable: true })
  reference_id: string;

  /**
   * Metadata bổ sung (JSON)
   */
  @Column({ type: 'json', nullable: true })
  metadata: any;

  /**
   * Các entries trong transaction này
   */
  @OneToMany(() => LedgerEntry, (entry) => entry.transaction, { cascade: true })
  entries: LedgerEntry[];

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}

