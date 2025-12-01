import { Lesson, LessonStatus } from '../entities/lesson.entity';

/**
 * Lesson Aggregate
 * Encapsulates lesson business logic
 */
export class LessonAggregate {
  private lesson: Lesson;

  constructor(lesson: Lesson) {
    this.lesson = lesson;
  }

  // Getters
  get id(): string {
    return this.lesson.id;
  }

  get sessionId(): string {
    return this.lesson.session_id;
  }

  get lessonNumber(): number {
    return this.lesson.lesson_number;
  }

  get title(): string {
    return this.lesson.title;
  }

  get status(): LessonStatus {
    return this.lesson.status;
  }

  get scheduledDate(): Date {
    return this.lesson.scheduled_date;
  }

  get startTime(): string {
    return this.lesson.start_time;
  }

  get endTime(): string {
    return this.lesson.end_time;
  }

  get durationMinutes(): number {
    return this.lesson.duration_minutes;
  }

  get isPreview(): boolean {
    return this.lesson.is_preview;
  }

  get isFree(): boolean {
    return this.lesson.is_free;
  }

  get entity(): Lesson {
    return this.lesson;
  }

  // Business Logic Methods

  /**
   * Check if lesson can be started
   */
  canStart(): { canStart: boolean; reason?: string } {
    if (this.lesson.status === LessonStatus.ONGOING) {
      return { canStart: false, reason: 'Lesson is already ongoing' };
    }

    if (this.lesson.status === LessonStatus.COMPLETED) {
      return { canStart: false, reason: 'Lesson is already completed' };
    }

    if (this.lesson.status === LessonStatus.CANCELLED) {
      return { canStart: false, reason: 'Cannot start cancelled lesson' };
    }

    const now = new Date();
    const scheduledDateTime = this.lesson.scheduled_datetime;
    const startWindow = new Date(scheduledDateTime.getTime() - 15 * 60 * 1000); // 15 minutes before

    if (now < startWindow) {
      return { canStart: false, reason: 'Lesson cannot start more than 15 minutes before scheduled time' };
    }

    return { canStart: true };
  }

  /**
   * Start the lesson
   */
  start(): void {
    const validation = this.canStart();
    if (!validation.canStart) {
      throw new Error(validation.reason || 'Cannot start lesson');
    }

    this.lesson.status = LessonStatus.ONGOING;
  }

  /**
   * Complete the lesson
   */
  complete(): void {
    if (this.lesson.status === LessonStatus.CANCELLED) {
      throw new Error('Cannot complete cancelled lesson');
    }
    this.lesson.status = LessonStatus.COMPLETED;
  }

  /**
   * Cancel the lesson
   */
  cancel(): void {
    if (this.lesson.status === LessonStatus.COMPLETED) {
      throw new Error('Cannot cancel completed lesson');
    }
    this.lesson.status = LessonStatus.CANCELLED;
  }

  /**
   * Check if lesson can be joined
   */
  canJoin(): boolean {
    return this.lesson.can_join;
  }

  /**
   * Check if lesson is past
   */
  isPast(): boolean {
    return this.lesson.is_past;
  }

  /**
   * Check if lesson is upcoming
   */
  isUpcoming(): boolean {
    return this.lesson.is_upcoming;
  }

  /**
   * Check if lesson is ongoing
   */
  isOngoing(): boolean {
    return this.lesson.is_ongoing;
  }

  /**
   * Update lesson schedule
   */
  updateSchedule(data: {
    scheduledDate?: Date;
    startTime?: string;
    endTime?: string;
    durationMinutes?: number;
  }): void {
    if (this.lesson.status === LessonStatus.COMPLETED) {
      throw new Error('Cannot update schedule of completed lesson');
    }

    if (this.lesson.status === LessonStatus.ONGOING) {
      throw new Error('Cannot update schedule of ongoing lesson');
    }

    if (data.scheduledDate !== undefined) {
      this.lesson.scheduled_date = data.scheduledDate;
    }
    if (data.startTime !== undefined) {
      this.lesson.start_time = data.startTime;
    }
    if (data.endTime !== undefined) {
      this.lesson.end_time = data.endTime;
    }
    if (data.durationMinutes !== undefined) {
      this.lesson.duration_minutes = data.durationMinutes;
    }
  }

  /**
   * Update lesson information
   */
  updateInfo(data: { title?: string; description?: string }): void {
    if (this.lesson.status === LessonStatus.COMPLETED) {
      throw new Error('Cannot update completed lesson');
    }

    if (data.title !== undefined) {
      this.lesson.title = data.title;
    }
    if (data.description !== undefined) {
      this.lesson.description = data.description;
    }
  }

  /**
   * Set lesson as preview
   */
  setPreview(isPreview: boolean): void {
    this.lesson.is_preview = isPreview;
  }

  /**
   * Set lesson as free
   */
  setFree(isFree: boolean): void {
    this.lesson.is_free = isFree;
  }

  /**
   * Set meeting information
   */
  setMeetingInfo(meetingId: string, livekitRoomName?: string, meetingLink?: string): void {
    this.lesson.meeting_id = meetingId;
    if (livekitRoomName) {
      this.lesson.livekit_room_name = livekitRoomName;
    }
    if (meetingLink) {
      this.lesson.meeting_link = meetingLink;
    }
  }
}

