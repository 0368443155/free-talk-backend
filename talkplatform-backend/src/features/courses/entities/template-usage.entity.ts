import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { CourseTemplate } from './course-template.entity';
import { Course } from './course.entity';
import { User } from '../../../users/user.entity';

@Entity('template_usage')
@Index(['templateId'])
@Index(['usedBy'])
export class TemplateUsage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'template_id' })
  templateId: string;

  @ManyToOne(() => CourseTemplate, (template) => template.usages, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'template_id' })
  template: CourseTemplate;

  @Column({ name: 'course_id' })
  courseId: string;

  @ManyToOne(() => Course, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'course_id' })
  course: Course;

  @Column({ name: 'used_by' })
  usedBy: string;

  @ManyToOne(() => User, { eager: false })
  @JoinColumn({ name: 'used_by' })
  user: User;

  @CreateDateColumn({ name: 'used_at' })
  usedAt: Date;
}

