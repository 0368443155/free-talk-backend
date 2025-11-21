import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('credit_packages')
export class CreditPackage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 200 })
  name: string;

  @Column({ type: 'varchar', length: 1000, nullable: true })
  description: string;

  @Column({ type: 'int' })
  credit_amount: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  usd_price: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  vnd_price: number;

  @Column({ type: 'int', default: 0 })
  bonus_credits: number; // Extra credits for bulk purchases

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  discount_percentage: number;

  @Column({ type: 'boolean', default: true })
  is_active: boolean;

  @Column({ type: 'boolean', default: false })
  is_featured: boolean;

  @Column({ type: 'int', default: 0 })
  sort_order: number;

  @Column({ type: 'json', nullable: true })
  features: string[]; // ["No expiry", "Priority support", etc.]

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}