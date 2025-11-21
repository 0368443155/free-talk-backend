import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';
import { TeacherProfile } from './teacher-profile.entity';
import { User } from '../../../users/user.entity';
import { Meeting } from '../../meeting/entities/meeting.entity';

@Entity('teacher_reviews')
@Index(['teacher_id', 'created_at'])
@Index(['rating', 'created_at'])
export class TeacherReview {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => TeacherProfile, { nullable: false })
  teacher: TeacherProfile;

  @Column({ type: 'uuid' })
  teacher_id: string;

  @ManyToOne(() => User, { nullable: false })
  student: User;

  @Column({ type: 'uuid' })
  student_id: string;

  @ManyToOne(() => Meeting, { nullable: true })
  meeting: Meeting;

  @Column({ type: 'uuid', nullable: true })
  meeting_id: string;

  @Column({ type: 'decimal', precision: 2, scale: 1 })
  rating: number; // 1.0 to 5.0

  @Column({ type: 'text', nullable: true })
  comment: string;

  @Column({ type: 'json', nullable: true })
  detailed_ratings: {
    teaching_quality?: number;
    communication?: number;
    punctuality?: number;
    preparation?: number;
    patience?: number;
  };

  @Column({ type: 'json', nullable: true })
  tags: string[]; // ['patient', 'clear', 'engaging', 'professional']

  @Column({ type: 'boolean', default: false })
  is_anonymous: boolean;

  @Column({ type: 'boolean', default: true })
  is_public: boolean;

  @Column({ type: 'boolean', default: false })
  is_featured: boolean; // Highlighted reviews

  @Column({ type: 'text', nullable: true })
  teacher_response: string;

  @Column({ type: 'timestamp', nullable: true })
  teacher_responded_at: Date;

  @Column({ type: 'boolean', default: false })
  is_verified: boolean; // Verified as genuine review

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}