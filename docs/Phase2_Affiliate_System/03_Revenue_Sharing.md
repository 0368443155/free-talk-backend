# 03. Revenue Sharing Implementation (Detailed)

## 1. Database Schema Updates

### 1.1. Meeting Entity Update (`src/features/meeting/entities/meeting.entity.ts`)
Thêm trạng thái thanh toán để tránh xử lý trùng lặp.

```typescript
export enum PaymentStatus {
    PENDING = 'pending',       // Chưa xử lý
    PROCESSING = 'processing', // Đang xử lý (lock)
    COMPLETED = 'completed',   // Đã trả tiền teacher & trừ tiền student
    FAILED = 'failed',         // Có lỗi xảy ra
    PARTIAL = 'partial'        // Một số student lỗi, một số thành công
}

@Entity('meetings')
export class Meeting {
    // ... existing fields

    @Column({
        type: 'enum',
        enum: PaymentStatus,
        default: PaymentStatus.PENDING
    })
    payment_status: PaymentStatus;

    @Column({ type: 'timestamp', nullable: true })
    payment_processed_at: Date;

    @Column({ type: 'json', nullable: true })
    payment_metadata: any; // Lưu chi tiết lỗi nếu có
}
```

## 2. Core Logic Implementation

### 2.1. Revenue Sharing Constants (`src/core/constants/revenue.constants.ts`)

```typescript
export const REVENUE_SHARE = {
    PLATFORM_DEFAULT: 0.30, // Platform takes 30% for organic students
    PLATFORM_REFERRAL: 0.10, // Platform takes 10% for teacher's referrals
    TEACHER_DEFAULT: 0.70,
    TEACHER_REFERRAL: 0.90
};
```

### 2.2. Enhanced `CreditsService` (`src/features/credits/credits.service.ts`)

```typescript
// Add method to process entire meeting revenue
async processMeetingRevenue(meetingId: string): Promise<void> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
        // 1. Lock meeting for processing
        const meeting = await queryRunner.manager.findOne(Meeting, {
            where: { id: meetingId },
            relations: ['host', 'participants', 'participants.user'],
            lock: { mode: 'pessimistic_write' } // Prevent double processing
        });

        if (!meeting || meeting.payment_status === PaymentStatus.COMPLETED) {
            await queryRunner.rollbackTransaction();
            return;
        }

        meeting.payment_status = PaymentStatus.PROCESSING;
        await queryRunner.manager.save(meeting);

        const results = [];
        let successCount = 0;

        // 2. Loop through participants
        for (const participant of meeting.participants) {
            // Skip host, skip if not joined, skip if already paid (check transaction log if needed)
            if (participant.user.id === meeting.host.id || participant.status !== 'joined') {
                continue;
            }

            try {
                // Process individual payment
                const result = await this.processSingleParticipantPayment(
                    queryRunner, 
                    meeting, 
                    participant.user
                );
                results.push({ userId: participant.user.id, status: 'success', ...result });
                successCount++;
            } catch (error) {
                this.logger.error(`Payment failed for user ${participant.user.id}: ${error.message}`);
                results.push({ userId: participant.user.id, status: 'failed', error: error.message });
            }
        }

        // 3. Finalize Meeting Status
        meeting.payment_status = successCount === meeting.participants.length 
            ? PaymentStatus.COMPLETED 
            : PaymentStatus.PARTIAL;
        meeting.payment_processed_at = new Date();
        meeting.payment_metadata = { results };

        await queryRunner.manager.save(meeting);
        await queryRunner.commitTransaction();

    } catch (err) {
        await queryRunner.rollbackTransaction();
        this.logger.error(`Failed to process revenue for meeting ${meetingId}`, err);
        throw err;
    } finally {
        await queryRunner.release();
    }
}

// Helper: Process Single Payment (Inside Transaction)
private async processSingleParticipantPayment(
    queryRunner: QueryRunner, 
    meeting: Meeting, 
    student: User
): Promise<any> {
    // A. Calculate Share
    const isReferral = await this.isAffiliateStudent(student, meeting.host);
    const platformRate = isReferral ? REVENUE_SHARE.PLATFORM_REFERRAL : REVENUE_SHARE.PLATFORM_DEFAULT;
    
    const totalAmount = meeting.price_credits;
    const platformFee = totalAmount * platformRate;
    const teacherEarning = totalAmount - platformFee;

    // B. Check Balance
    if (student.credit_balance < totalAmount) {
        throw new BadRequestException('Insufficient balance');
    }

    // C. Update Balances
    student.credit_balance -= totalAmount;
    meeting.host.credit_balance += teacherEarning;

    await queryRunner.manager.save(student);
    await queryRunner.manager.save(meeting.host);

    // D. Create Transactions Records
    // ... (Create DEDUCTION and EARNING records using queryRunner.manager)
    
    return { platformFee, teacherEarning };
}
```

## 3. Trigger Mechanism

### 3.1. Meeting Ended Listener (`src/features/meeting/listeners/meeting-ended.listener.ts`)
Sử dụng NestJS Event Emitter.

```typescript
@Injectable()
export class MeetingEndedListener {
    constructor(private readonly creditsService: CreditsService) {}

    @OnEvent('meeting.ended')
    async handleMeetingEndedEvent(payload: MeetingEndedEvent) {
        const { meetingId } = payload;
        
        // Delay 1-2 mins to ensure all participants left and logs are synced?
        // Or process immediately.
        
        console.log(`Processing revenue for meeting ${meetingId}...`);
        await this.creditsService.processMeetingRevenue(meetingId);
    }
}
```

### 3.2. Scheduled Job (Fallback) (`src/features/cron/revenue-sweeper.job.ts`)
Dùng để quét các meeting bị sót (do server crash lúc event emit).

```typescript
@Injectable()
export class RevenueSweeperJob {
    constructor(
        @InjectRepository(Meeting) private meetingRepo: Repository<Meeting>,
        private creditsService: CreditsService
    ) {}

    @Cron(CronExpression.EVERY_30_MINUTES)
    async sweepUnprocessedMeetings() {
        // Find meetings ended > 30 mins ago but payment_status is PENDING
        const meetings = await this.meetingRepo.find({
            where: {
                status: MeetingStatus.ENDED,
                payment_status: PaymentStatus.PENDING,
                ended_at: LessThan(new Date(Date.now() - 30 * 60 * 1000))
            },
            take: 10 // Process batch of 10
        });

        for (const meeting of meetings) {
            await this.creditsService.processMeetingRevenue(meeting.id);
        }
    }
}
```

## 4. Testing & Validation

1.  **Unit Test**: Mock `QueryRunner` để test logic transaction rollback khi lỗi.
2.  **Integration Test**:
    *   Tạo meeting với 2 user (1 referral, 1 organic).
    *   Gọi `processMeetingRevenue`.
    *   Assert:
        *   User A (Referral): Trừ 100, Teacher +90.
        *   User B (Organic): Trừ 100, Teacher +70.
        *   Meeting status -> COMPLETED.
