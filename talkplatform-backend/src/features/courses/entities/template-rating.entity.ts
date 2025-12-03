import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  Unique,
} from 'typeorm';
import { CourseTemplate } from './course-template.entity';
import { User } from '../../../users/user.entity';

@Entity('template_ratings')
@Unique(['templateId', 'userId'])
@Index(['templateId'])
@Index(['rating'])
export class TemplateRating {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'template_id' })
  templateId: string;

  @ManyToOne(() => CourseTemplate, (template) => template.ratings, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'template_id' })
  template: CourseTemplate;

  @Column({ name: 'user_id' })
  userId: string;

  @ManyToOne(() => User, { eager: false })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'int' })
  rating: number; // 1-5

  @Column('text', { nullable: true })
  review: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

