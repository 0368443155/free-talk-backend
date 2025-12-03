import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { User } from '../../../users/user.entity';
import { TemplateRating } from './template-rating.entity';
import { TemplateUsage } from './template-usage.entity';

export interface SessionStructure {
  sessionNumber: number;
  title: string;
  description: string;
  durationMinutes: number;
  topics: string[];
  lessonCount: number;
}

export interface LessonStructure {
  sessionNumber: number;
  lessons: {
    lessonNumber: number;
    title: string;
    description: string;
    durationMinutes: number;
    type: 'lecture' | 'interactive' | 'practice' | 'assessment';
  }[];
}

export interface MaterialStructure {
  sessionNumber: number;
  lessonNumber: number;
  materials: {
    title: string;
    type: string;
    description: string;
  }[];
}

@Entity('course_templates')
@Index(['category'])
@Index(['level'])
@Index(['isPublic'])
@Index(['isFeatured'])
@Index(['usageCount'])
@Index(['rating'])
export class CourseTemplate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 255 })
  name: string;

  @Column('text', { nullable: true })
  description: string;

  // Ownership
  @Column({ name: 'created_by' })
  createdBy: string;

  @ManyToOne(() => User, { eager: false })
  @JoinColumn({ name: 'created_by' })
  creator: User;

  @Column({ name: 'is_public', default: false })
  isPublic: boolean;

  @Column({ name: 'is_featured', default: false })
  isFeatured: boolean;

  // Categorization
  @Column({ length: 100, nullable: true })
  category: string;

  @Column({ length: 50, nullable: true })
  level: string;

  @Column({ length: 50, nullable: true })
  language: string;

  // Structure Metadata
  @Column({ name: 'total_sessions' })
  totalSessions: number;

  @Column({ name: 'sessions_per_week', nullable: true })
  sessionsPerWeek: number;

  @Column({ name: 'total_duration_hours', nullable: true })
  totalDurationHours: number;

  // Template Data (JSON)
  @Column({ name: 'session_structure', type: 'json' })
  sessionStructure: SessionStructure[];

  @Column({ name: 'lesson_structure', type: 'json', nullable: true })
  lessonStructure: LessonStructure[];

  @Column({ name: 'default_materials', type: 'json', nullable: true })
  defaultMaterials: MaterialStructure[];

  // Pricing Suggestions
  @Column({ name: 'suggested_price_full', type: 'decimal', precision: 10, scale: 2, nullable: true })
  suggestedPriceFull: number;

  @Column({ name: 'suggested_price_session', type: 'decimal', precision: 10, scale: 2, nullable: true })
  suggestedPriceSession: number;

  // Usage Statistics
  @Column({ name: 'usage_count', default: 0 })
  usageCount: number;

  @Column({ type: 'decimal', precision: 3, scale: 2, nullable: true })
  rating: number;

  @Column({ name: 'total_ratings', default: 0 })
  totalRatings: number;

  // Metadata
  @Column({ type: 'json', nullable: true })
  tags: string[];

  @Column({ name: 'thumbnail_url', length: 500, nullable: true })
  thumbnailUrl: string;

  // Relations
  @OneToMany(() => TemplateRating, (rating) => rating.template, { cascade: true })
  ratings: TemplateRating[];

  @OneToMany(() => TemplateUsage, (usage) => usage.template, { cascade: true })
  usages: TemplateUsage[];

  // Timestamps
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

