import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { LedgerTransaction } from './ledger-transaction.entity';

/**
 * Ledger Entry Entity
 * 
 * Đại diện cho một entry trong sổ cái kép
 * Mỗi entry phải có một entry đối ứng (DEBIT/CREDIT) để tổng = 0
 */
export enum EntryType {
  DEBIT = 'DEBIT',   // Ghi nợ (giảm tài sản, tăng chi phí)
  CREDIT = 'CREDIT', // Ghi có (tăng tài sản, tăng doanh thu)
}

@Entity('ledger_entries')
@Index(['account_id', 'created_at'])
@Index(['transaction_id'])
@Index(['entry_type'])
export class LedgerEntry {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * Transaction chứa entry này
   */
  @ManyToOne(() => LedgerTransaction, (transaction) => transaction.entries, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'transaction_id' })
  transaction: LedgerTransaction;

  @Column({ type: 'uuid' })
  transaction_id: string;

  /**
   * Account ID
   * Có thể là:
   * - user_id (ví dụ: 'user-123')
   * - 'platform' (tài khoản platform)
   * - 'escrow' (tài khoản tạm giữ)
   * - 'revenue' (tài khoản doanh thu)
   */
  @Column({ type: 'varchar', length: 100 })
  account_id: string;

  /**
   * Loại entry (DEBIT hoặc CREDIT)
   */
  @Column({ type: 'enum', enum: EntryType })
  entry_type: EntryType;

  /**
   * Số tiền (luôn dương, entry_type quyết định tăng/giảm)
   */
  @Column({ type: 'decimal', precision: 15, scale: 2 })
  amount: number;

  /**
   * Số dư sau entry này
   */
  @Column({ type: 'decimal', precision: 15, scale: 2 })
  balance_after: number;

  /**
   * Mô tả entry
   */
  @Column({ type: 'varchar', length: 500, nullable: true })
  description: string;

  @CreateDateColumn()
  created_at: Date;
}

