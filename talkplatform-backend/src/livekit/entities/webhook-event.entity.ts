import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

/**
 * Webhook Event Entity
 * Lưu tất cả webhook events để debug và monitoring
 */
@Entity('webhook_events')
@Index(['event', 'createdAt'])
@Index(['roomName', 'createdAt'])
export class WebhookEvent {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'varchar', length: 100 })
    event: string; // 'room_started', 'participant_joined', 'test', etc.

    @Column({ type: 'varchar', length: 255, nullable: true })
    roomName: string | null;

    @Column({ type: 'varchar', length: 255, nullable: true })
    participantIdentity: string | null;

    @Column({ type: 'text', nullable: true })
    eventData: string; // JSON string of full event data

    @Column({ type: 'boolean', default: false })
    isTestEvent: boolean;

    @Column({ type: 'boolean', default: false })
    processed: boolean; // Whether the event was successfully processed

    @Column({ type: 'text', nullable: true })
    errorMessage: string | null;

    @CreateDateColumn()
    createdAt: Date;
}


