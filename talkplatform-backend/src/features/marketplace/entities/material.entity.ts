import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    ManyToOne,
    OneToMany,
    JoinColumn,
} from 'typeorm';
import { User } from '../../../users/user.entity';
import { MaterialCategory } from './material-category.entity';
import { MaterialPurchase } from './material-purchase.entity';
import { MaterialReview } from './material-review.entity';

export enum MaterialType {
    PDF = 'pdf',
    VIDEO = 'video',
    SLIDE = 'slide',
    AUDIO = 'audio',
    DOCUMENT = 'document',
    COURSE = 'course',
    EBOOK = 'ebook',
}

export enum MaterialLevel {
    BEGINNER = 'beginner',
    INTERMEDIATE = 'intermediate',
    ADVANCED = 'advanced',
    ALL = 'all',
}

@Entity('materials')
export class Material {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'char', length: 36 })
    teacher_id: string;

    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'teacher_id' })
    teacher: User;

    @Column({ type: 'char', length: 36, nullable: true })
    category_id: string;

    @ManyToOne(() => MaterialCategory, { nullable: true, onDelete: 'SET NULL' })
    @JoinColumn({ name: 'category_id' })
    category: MaterialCategory;

    @Column({ type: 'varchar', length: 255 })
    title: string;

    @Column({ type: 'text' })
    description: string;

    @Column({
        type: 'enum',
        enum: MaterialType,
    })
    material_type: MaterialType;

    @Column({ type: 'varchar', length: 500 })
    file_url: string;

    @Column({ type: 'int', nullable: true })
    file_size: number;

    @Column({ type: 'varchar', length: 500, nullable: true })
    preview_url: string;

    @Column({ type: 'varchar', length: 500, nullable: true })
    thumbnail_url: string;

    @Column({ type: 'int', default: 0 })
    price_credits: number;

    @Column({ type: 'int', nullable: true })
    original_price_credits: number;

    @Column({ type: 'varchar', length: 50, nullable: true })
    language: string;

    @Column({
        type: 'enum',
        enum: MaterialLevel,
        default: MaterialLevel.ALL,
    })
    level: MaterialLevel;

    @Column({ type: 'json', nullable: true })
    tags: string[];

    @Column({ type: 'int', nullable: true })
    duration: number;

    @Column({ type: 'int', nullable: true })
    page_count: number;

    @Column({ type: 'int', default: 0 })
    download_count: number;

    @Column({ type: 'int', default: 0 })
    view_count: number;

    @Column({ type: 'decimal', precision: 3, scale: 2, default: 0.0 })
    rating: number;

    @Column({ type: 'int', default: 0 })
    total_reviews: number;

    @Column({ type: 'int', default: 0 })
    total_sales: number;

    @Column({ type: 'int', default: 0 })
    total_revenue: number;

    @Column({ type: 'boolean', default: false })
    is_published: boolean;

    @Column({ type: 'boolean', default: false })
    is_featured: boolean;

    @Column({ type: 'timestamp', precision: 6, nullable: true })
    published_at: Date;

    @CreateDateColumn({ type: 'timestamp', precision: 6 })
    created_at: Date;

    @UpdateDateColumn({ type: 'timestamp', precision: 6 })
    updated_at: Date;

    @OneToMany(() => MaterialPurchase, (purchase) => purchase.material)
    purchases: MaterialPurchase[];

    @OneToMany(() => MaterialReview, (review) => review.material)
    reviews: MaterialReview[];
}
