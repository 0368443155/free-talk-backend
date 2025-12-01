import { Controller, Post, Body, Headers, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { AttendanceService } from './attendance.service';
import { CourseSession } from './entities/course-session.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SessionStatus } from './entities/course-session.entity';

@ApiTags('Course Attendance Webhooks')
@Controller('webhooks/course-attendance')
export class CourseAttendanceWebhookController {
  private readonly logger = new Logger(CourseAttendanceWebhookController.name);

  constructor(
    private attendanceService: AttendanceService,
    @InjectRepository(CourseSession)
    private sessionRepository: Repository<CourseSession>,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Handle LiveKit webhooks for course attendance tracking' })
  async handleWebhook(
    @Body() event: any,
    @Headers('livekit-signature') signature: string,
  ) {
    this.logger.log(`Received webhook: ${event.event}`);

    // TODO: Verify webhook signature
    // const isValid = await this.livekitService.verifyWebhookSignature(event, signature);
    // if (!isValid) {
    //   throw new UnauthorizedException('Invalid webhook signature');
    // }

    switch (event.event) {
      case 'participant_joined':
        return this.handleParticipantJoined(event);
      case 'participant_left':
        return this.handleParticipantLeft(event);
      case 'room_finished':
        return this.handleRoomFinished(event);
      default:
        this.logger.log(`Unhandled event: ${event.event}`);
        return { message: 'Event received' };
    }
  }

  private async handleParticipantJoined(event: any) {
    const roomName = event.room?.name;
    const userId = event.participant?.identity;
    const joinedAt = event.participant?.joined_at 
      ? new Date(event.participant.joined_at * 1000)
      : new Date();

    if (!roomName || !userId) {
      this.logger.warn(`Invalid participant_joined event: missing room name or user id`);
      return { message: 'Invalid event data' };
    }

    // Parse room name: "course_{courseId}_session_{sessionNumber}_lesson_{lessonNumber}"
    // Or simpler format: "course_{courseId}_session_{sessionNumber}"
    const parts = roomName.split('_');
    if (parts[0] !== 'course' || parts.length < 4) {
      this.logger.log(`Not a course session room: ${roomName}`);
      return { message: 'Not a course session room' };
    }

    const courseId = parts[1];
    const sessionNumber = parseInt(parts[3], 10);

    if (isNaN(sessionNumber)) {
      this.logger.warn(`Invalid session number in room name: ${roomName}`);
      return { message: 'Invalid session number' };
    }

    // Find session
    const session = await this.sessionRepository.findOne({
      where: { course_id: courseId, session_number: sessionNumber },
    });

    if (!session) {
      this.logger.warn(`Session not found: course=${courseId}, session=${sessionNumber}`);
      return { message: 'Session not found' };
    }

    // Track attendance
    await this.attendanceService.trackJoin(session.id, userId, joinedAt);

    return {
      message: 'Attendance recorded',
      session_id: session.id,
      user_id: userId,
      joined_at: joinedAt,
    };
  }

  private async handleParticipantLeft(event: any) {
    const roomName = event.room?.name;
    const userId = event.participant?.identity;
    const leftAt = event.created_at 
      ? new Date(event.created_at * 1000)
      : new Date();

    if (!roomName || !userId) {
      this.logger.warn(`Invalid participant_left event: missing room name or user id`);
      return { message: 'Invalid event data' };
    }

    // Parse room name
    const parts = roomName.split('_');
    if (parts[0] !== 'course' || parts.length < 4) {
      this.logger.log(`Not a course session room: ${roomName}`);
      return { message: 'Not a course session room' };
    }

    const courseId = parts[1];
    const sessionNumber = parseInt(parts[3], 10);

    if (isNaN(sessionNumber)) {
      this.logger.warn(`Invalid session number in room name: ${roomName}`);
      return { message: 'Invalid session number' };
    }

    // Find session
    const session = await this.sessionRepository.findOne({
      where: { course_id: courseId, session_number: sessionNumber },
    });

    if (!session) {
      this.logger.warn(`Session not found: course=${courseId}, session=${sessionNumber}`);
      return { message: 'Session not found' };
    }

    // Track leave
    const attendance = await this.attendanceService.trackLeave(
      session.id,
      userId,
      leftAt,
    );

    return {
      message: 'Attendance updated',
      session_id: session.id,
      user_id: userId,
      duration_minutes: attendance?.duration_minutes,
      attendance_percentage: attendance?.attendance_percentage,
    };
  }

  private async handleRoomFinished(event: any) {
    const roomName = event.room?.name;

    if (!roomName) {
      this.logger.warn(`Invalid room_finished event: missing room name`);
      return { message: 'Invalid event data' };
    }

    // Parse room name
    const parts = roomName.split('_');
    if (parts[0] !== 'course' || parts.length < 4) {
      this.logger.log(`Not a course session room: ${roomName}`);
      return { message: 'Not a course session room' };
    }

    const courseId = parts[1];
    const sessionNumber = parseInt(parts[3], 10);

    if (isNaN(sessionNumber)) {
      this.logger.warn(`Invalid session number in room name: ${roomName}`);
      return { message: 'Invalid session number' };
    }

    // Find session
    const session = await this.sessionRepository.findOne({
      where: { course_id: courseId, session_number: sessionNumber },
    });

    if (!session) {
      this.logger.warn(`Session not found: course=${courseId}, session=${sessionNumber}`);
      return { message: 'Session not found' };
    }

    // Mark session as completed
    session.status = SessionStatus.COMPLETED;
    await this.sessionRepository.save(session);

    this.logger.log(`Session ${session.id} marked as completed`);

    return {
      message: 'Session marked as completed',
      session_id: session.id,
    };
  }
}

