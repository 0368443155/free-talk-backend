import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    OneToMany,
    OneToOne,
    ManyToOne,
    JoinColumn,
    BeforeInsert,
    Index,
} from 'typeorm';
import * as bcrypt from 'bcrypt';
import { TeacherProfile } from '../features/teachers/entities/teacher-profile.entity';
import { Exclude } from 'class-transformer';
import { profile } from 'console';
import { MeetingParticipant } from '../features/meeting/entities/meeting-participant.entity';

// Thêm enum này vào file user.entity.ts
export enum UserRole {
    STUDENT = 'student',
    TEACHER = 'teacher',
    ADMIN = 'admin',
}

@Entity('users')
export class User {
    @PrimaryGeneratedColumn('uuid')
    id: string; //uuid from firebase auth or create logic

    // Alias for compatibility with frontend
    get user_id(): string {
        return this.id;
    }

    get name(): string {
        return this.username;
    }

    @Column({ type: 'varchar', length: 100, unique: true })
    email: string;

    @Column({ type: 'varchar', length: 50 })
    username: string;

    @Column({ type: 'varchar', length: 255, nullable: true })
    @Exclude()
    password: string | null;

    @Column({ type: 'varchar', length: 255, nullable: true })
    clerkId: string;

    @Column({ type: 'varchar', nullable: true })
    avatar_url: string;

    @Column({
        type: 'enum',
        enum: UserRole,
        default: UserRole.STUDENT
    })
    role: UserRole;

    @Column({ type: 'int', default: 0 })
    credit_balance: number;

    @Column({ type: 'char', length: 20, nullable: true, unique: true })
    affiliate_code: string;

    @Column({ type: 'char', length: 36, nullable: true })
    @Index('IDX_USERS_REFERRER_ID')
    referrer_id: string;

    @CreateDateColumn({ type: 'timestamp', precision: 6, default: () => 'CURRENT_TIMESTAMP(6)' })
    created_at: Date;

    @UpdateDateColumn({ type: 'timestamp', precision: 6, default: () => 'CURRENT_TIMESTAMP(6)', onUpdate: 'CURRENT_TIMESTAMP(6)' })
    updated_at: Date;

    //relationship: one user - one teacherprofile
    @OneToOne(() => TeacherProfile, (profile) => profile.user)
    teacherProfile: TeacherProfile;

    // 3. THÊM CODE DƯỚI ĐÂY
    @OneToMany(() => MeetingParticipant, (participant) => participant.user)
    participants: MeetingParticipant[];

    // Self-referencing relation for referrer
    @ManyToOne(() => User, { nullable: true })
    @JoinColumn({ name: 'referrer_id' })
    referrer: User;

    @OneToMany(() => User, (user) => user.referrer)
    referred_users: User[];

    //hook hash mật khẩu - chỉ hash nếu có password (OAuth users không có password)
    @BeforeInsert()
    async hashPassword() {
        // Chỉ hash password nếu password tồn tại và không null/undefined
        // OAuth users không có password nên sẽ bỏ qua bước này
        if (this.password) {
            this.password = await bcrypt.hash(this.password, 10);
        }
    }
}