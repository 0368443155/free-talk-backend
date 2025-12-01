import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AttendanceRecord, AttendanceStatus } from './entities/attendance-record.entity';
import { CourseSession } from './entities/course-session.entity';
import { SessionPurchase } from './entities/session-purchase.entity';

@Injectable()
export class AttendanceService {
  private readonly logger = new Logger(AttendanceService.name);

  constructor(
    @InjectRepository(AttendanceRecord)
    private attendanceRepository: Repository<AttendanceRecord>,
    @InjectRepository(CourseSession)
    private sessionRepository: Repository<CourseSession>,
    @InjectRepository(SessionPurchase)
    private purchaseRepository: Repository<SessionPurchase>,
  ) {}

  /**
   * Track when participant joins
   */
  async trackJoin(sessionId: string, userId: string, joinedAt: Date) {
    this.logger.log(`Tracking join: session=${sessionId}, user=${userId}`);

    let attendance = await this.attendanceRepository.findOne({
      where: { session_id: sessionId, user_id: userId },
    });

    if (!attendance) {
      attendance = this.attendanceRepository.create({
        session_id: sessionId,
        user_id: userId,
        joined_at: joinedAt,
        status: AttendanceStatus.PRESENT,
      });
    } else {
      attendance.joined_at = joinedAt;
      attendance.status = AttendanceStatus.PRESENT;
    }

    await this.attendanceRepository.save(attendance);
    this.logger.log(`✅ Join tracked for user ${userId}`);

    return attendance;
  }

  /**
   * Track when participant leaves
   */
  async trackLeave(sessionId: string, userId: string, leftAt: Date) {
    this.logger.log(`Tracking leave: session=${sessionId}, user=${userId}`);

    const attendance = await this.attendanceRepository.findOne({
      where: { session_id: sessionId, user_id: userId },
      relations: ['session'],
    });

    if (!attendance) {
      this.logger.warn(`No attendance record found for user ${userId}`);
      return null;
    }

    if (!attendance.joined_at) {
      this.logger.warn(`No joined_at timestamp for user ${userId}`);
      return null;
    }

    // Calculate duration
    const joinedAt = attendance.joined_at;
    const durationMs = leftAt.getTime() - joinedAt.getTime();
    const durationMinutes = Math.floor(durationMs / 60000);

    // Calculate attendance percentage
    // Default to 60 minutes if session duration is not available
    // In the future, we can calculate from lessons or store in session
    const sessionDuration = 60; // Default session duration in minutes
    const attendancePercentage = (durationMinutes / sessionDuration) * 100;

    // Update attendance
    attendance.left_at = leftAt;
    attendance.duration_minutes = durationMinutes;
    attendance.attendance_percentage = Math.min(100, attendancePercentage);

    // Update status
    if (attendancePercentage >= 20) {
      attendance.status = AttendanceStatus.PRESENT;
    } else {
      attendance.status = AttendanceStatus.ABSENT;
    }

    await this.attendanceRepository.save(attendance);

    // Update session purchase if exists
    const purchase = await this.purchaseRepository.findOne({
      where: { session_id: sessionId, user_id: userId },
    });

    if (purchase) {
      purchase.attendance_duration_minutes = durationMinutes;
      purchase.attended = attendancePercentage >= 20;
      await this.purchaseRepository.save(purchase);
    }

    this.logger.log(
      `✅ Leave tracked: duration=${durationMinutes}min, attendance=${attendancePercentage.toFixed(2)}%`,
    );

    return attendance;
  }

  /**
   * Get attendance for session
   */
  async getSessionAttendance(sessionId: string) {
    return this.attendanceRepository.find({
      where: { session_id: sessionId },
      relations: ['user'],
      order: { created_at: 'DESC' },
    });
  }

  /**
   * Get user attendance for all sessions
   */
  async getUserAttendance(userId: string) {
    return this.attendanceRepository.find({
      where: { user_id: userId },
      relations: ['session', 'session.course'],
      order: { created_at: 'DESC' },
    });
  }
}

