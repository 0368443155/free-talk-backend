import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    ManyToOne,
    JoinColumn,
} from 'typeorm';
import { User } from '../../../users/user.entity';
import { Material } from './material.entity';

@Entity('material_reviews')
export class MaterialReview {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'char', length: 36 })
    material_id: string;

    @ManyToOne(() => Material, (material) => material.reviews, {
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
    rating: number; // 1-5

    @Column({ type: 'text', nullable: true })
    comment: string;

    @Column({ type: 'boolean', default: false })
    is_verified_purchase: boolean;

    @Column({ type: 'int', default: 0 })
    helpful_count: number;

    @CreateDateColumn({ type: 'timestamp', precision: 6 })
    created_at: Date;

    @UpdateDateColumn({ type: 'timestamp', precision: 6 })
    updated_at: Date;
}
