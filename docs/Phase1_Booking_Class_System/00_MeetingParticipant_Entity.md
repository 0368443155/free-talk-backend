# MEETING PARTICIPANT ENTITY

**Ngày tạo:** 03/12/2025  
**File:** MeetingParticipant_Entity_Definition.md  
**Mục đích:** Track user participation trong meetings

---

## 📋 ENTITY DEFINITION

```typescript
// File: src/features/meeting/entities/meeting-participant.entity.ts

import { 
  Entity, 
  PrimaryGeneratedColumn, 
  Column, 
  ManyToOne, 
  JoinColumn,
  CreateDateColumn,
  Index
} from 'typeorm';
import { Meeting } from './meeting.entity';
import { User } from '../../users/user.entity';

@Entity('meeting_participants')
@Index(['meeting_id', 'user_id'], { unique: true })
@Index(['meeting_id'])
@Index(['user_id'])
export class MeetingParticipant {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  meeting_id: string;

  @ManyToOne(() => Meeting)
  @JoinColumn({ name: 'meeting_id' })
  meeting: Meeting;

  @Column({ type: 'uuid' })
  user_id: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'int', default: 0 })
  duration_seconds: number; // Tổng thời gian tham gia (giây)

  @Column({ type: 'timestamp' })
  joined_at: Date; // Thời điểm join

  @Column({ type: 'timestamp', nullable: true })
  left_at: Date; // Thời điểm rời phòng

  @Column({ type: 'varchar', length: 100, nullable: true })
  device_type: string; // web, mobile, desktop

  @Column({ type: 'varchar', length: 50, nullable: true })
  connection_quality: string; // excellent, good, poor

  @CreateDateColumn()
  created_at: Date;
}
```

---

## 🗄️ MIGRATION

```typescript
// File: src/database/migrations/XXXXXX-CreateMeetingParticipants.ts

import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateMeetingParticipants implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE meeting_participants (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        meeting_id UUID NOT NULL,
        user_id UUID NOT NULL,
        duration_seconds INT DEFAULT 0,
        joined_at TIMESTAMP NOT NULL,
        left_at TIMESTAMP NULL,
        device_type VARCHAR(100) NULL,
        connection_quality VARCHAR(50) NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        CONSTRAINT fk_meeting_participants_meeting 
          FOREIGN KEY (meeting_id) REFERENCES meetings(id) ON DELETE CASCADE,
        CONSTRAINT fk_meeting_participants_user 
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        CONSTRAINT uq_meeting_user UNIQUE (meeting_id, user_id)
      );
    `);

    await queryRunner.query(`
      CREATE INDEX idx_meeting_participants_meeting_id ON meeting_participants(meeting_id);
      CREATE INDEX idx_meeting_participants_user_id ON meeting_participants(user_id);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE meeting_participants;`);
  }
}
```

---

## 📊 USE CASES

### 1. Track Participation
```typescript
// Khi user join meeting
const participant = meetingParticipantRepository.create({
  meeting_id: meetingId,
  user_id: userId,
  joined_at: new Date(),
  device_type: 'web',
});
await meetingParticipantRepository.save(participant);
```

### 2. Update Duration
```typescript
// Khi user leave meeting
const participant = await meetingParticipantRepository.findOne({
  where: { meeting_id: meetingId, user_id: userId },
});

if (participant) {
  participant.left_at = new Date();
  participant.duration_seconds = Math.floor(
    (participant.left_at.getTime() - participant.joined_at.getTime()) / 1000
  );
  await meetingParticipantRepository.save(participant);
}
```

### 3. Verify Teacher Attendance
```typescript
// Check if teacher joined for at least 5 minutes
const teacherParticipation = await meetingParticipantRepository.findOne({
  where: {
    meeting_id: meetingId,
    user_id: teacherId,
  },
});

const attended = teacherParticipation && teacherParticipation.duration_seconds > 300;
```

---

## 🔗 INTEGRATION

### Module Setup
```typescript
// File: src/features/meeting/meeting.module.ts

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Meeting } from './entities/meeting.entity';
import { MeetingParticipant } from './entities/meeting-participant.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Meeting, MeetingParticipant]),
  ],
  // ...
})
export class MeetingModule {}
```

---

**Related Files:**
- `02_Auto_Schedule_Implementation.md` (uses this entity)
- `06_Check_In_Middleware.md` (tracks participation)
