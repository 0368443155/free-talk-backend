import {
    Entity,
    PrimaryColumn,
    Column,
    OneToOne,
    JoinColumn,
    UpdateDateColumn, // Thêm UpdateDateColumn
    CreateDateColumn, // Thêm CreateDateColumn
} from 'typeorm';
import { User } from '../users/user.entity';

@Entity('teacher_profiles')
export class TeacherProfile {
    // Khóa chính là user_id, đồng thời là khóa ngoại tới Users.id
    @PrimaryColumn('char', { length: 36 })
    user_id: string;

    @Column({ type: 'varchar', length: 255, nullable: true })
    headline: string;

    @Column({ type: 'text', nullable: true })
    bio: string;

    @Column({ type: 'varchar', length: 255, nullable: true })
    intro_video_url: string;

    @Column({ type: 'int', default: 1 }) // Giá tối thiểu 1 credit
    hourly_rate: number;

    @Column({ type: 'float', default: 0 }) // Điểm đánh giá trung bình
    average_rating: number;

    @Column({ type: 'int', default: 0 }) // Tổng số giờ đã dạy
    total_hours_taught: number;

    @Column({ type: 'boolean', default: false }) // Trạng thái xác thực
    is_verified: boolean;

    @CreateDateColumn({ type: 'timestamp', precision: 6, default: () => 'CURRENT_TIMESTAMP(6)' })
    created_at: Date; // Thêm created_at

    @UpdateDateColumn({ type: 'timestamp', precision: 6, default: () => 'CURRENT_TIMESTAMP(6)', onUpdate: 'CURRENT_TIMESTAMP(6)' })
    updated_at: Date; // Thêm updated_at

    // --- Quan hệ: TeacherProfile này thuộc về User nào ---
    // onDelete: 'CASCADE' nghĩa là nếu User bị xóa, TeacherProfile cũng bị xóa theo
    @OneToOne(() => User, user => user.teacherProfile, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'user_id' }) // Chỉ định cột khóa ngoại là 'user_id'
    user: User; // Tên thuộc tính để truy cập User từ TeacherProfile
}