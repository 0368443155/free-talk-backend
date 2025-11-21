import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    ManyToOne,
    JoinColumn,
} from 'typeorm';
import { User } from '../../../users/user.entity';
import { Material } from './material.entity';

@Entity('material_purchases')
export class MaterialPurchase {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'char', length: 36 })
    material_id: string;

    @ManyToOne(() => Material, (material) => material.purchases, {
        onDelete: 'CASCADE',
    })
    @JoinColumn({ name: 'material_id' })
    material: Material;

    @Column({ type: 'char', length: 36 })
    user_id: string;

    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'user_id' })
    user: User;

    @Column({ type: 'int' })
    price_paid: number;

    @Column({ type: 'char', length: 36, nullable: true })
    transaction_id: string;

    @Column({ type: 'int', default: 0 })
    download_count: number;

    @Column({ type: 'timestamp', precision: 6, nullable: true })
    last_downloaded_at: Date;

    @CreateDateColumn({ type: 'timestamp', precision: 6 })
    purchased_at: Date;
}
