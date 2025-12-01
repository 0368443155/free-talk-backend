import { CourseSession, SessionStatus } from '../entities/course-session.entity';
import { Lesson } from '../entities/lesson.entity';

/**
 * Session Aggregate
 * Encapsulates session business logic
 */
export class SessionAggregate {
  private session: CourseSession;
  private lessons: Lesson[] = [];

  constructor(session: CourseSession, lessons: Lesson[] = []) {
    this.session = session;
    this.lessons = lessons;
  }

  // Getters
  get id(): string {
    return this.session.id;
  }

  get courseId(): string {
    return this.session.course_id;
  }

  get sessionNumber(): number {
    return this.session.session_number;
  }

  get title(): string {
    return this.session.title;
  }

  get status(): SessionStatus {
    return this.session.status;
  }

  get totalLessons(): number {
    return this.session.total_lessons;
  }

  get entity(): CourseSession {
    return this.session;
  }

  get lessonList(): Lesson[] {
    return [...this.lessons];
  }

  // Business Logic Methods

  /**
   * Check if session can be published
   */
  canPublish(): { canPublish: boolean; reason?: string } {
    if (this.session.status === SessionStatus.PUBLISHED) {
      return { canPublish: false, reason: 'Session is already published' };
    }

    if (this.session.status === SessionStatus.ARCHIVED) {
      return { canPublish: false, reason: 'Cannot publish archived session' };
    }

    if (!this.session.title || this.session.title.trim().length === 0) {
      return { canPublish: false, reason: 'Session title is required' };
    }

    if (this.lessons.length === 0) {
      return { canPublish: false, reason: 'Session must have at least one lesson' };
    }

    return { canPublish: true };
  }

  /**
   * Publish the session
   */
  publish(): void {
    const validation = this.canPublish();
    if (!validation.canPublish) {
      throw new Error(validation.reason || 'Cannot publish session');
    }

    this.session.status = SessionStatus.PUBLISHED;
  }

  /**
   * Unpublish the session
   */
  unpublish(): void {
    this.session.status = SessionStatus.DRAFT;
  }

  /**
   * Complete the session
   */
  complete(): void {
    if (this.session.status === SessionStatus.DRAFT) {
      throw new Error('Cannot complete draft session');
    }
    this.session.status = SessionStatus.COMPLETED;
  }

  /**
   * Archive the session
   */
  archive(): void {
    this.session.status = SessionStatus.ARCHIVED;
  }

  /**
   * Add a lesson to the session
   */
  addLesson(lesson: Lesson): void {
    if (this.session.status === SessionStatus.ARCHIVED) {
      throw new Error('Cannot add lesson to archived session');
    }

    // Check for duplicate lesson number
    const existingLesson = this.lessons.find(l => l.lesson_number === lesson.lesson_number);
    if (existingLesson) {
      throw new Error(`Lesson number ${lesson.lesson_number} already exists in this session`);
    }

    this.lessons.push(lesson);
    this.session.total_lessons = this.lessons.length;
  }

  /**
   * Remove a lesson from the session
   */
  removeLesson(lessonId: string): void {
    if (this.session.status === SessionStatus.PUBLISHED) {
      throw new Error('Cannot remove lesson from published session');
    }

    this.lessons = this.lessons.filter(l => l.id !== lessonId);
    this.session.total_lessons = this.lessons.length;
  }

  /**
   * Update session information
   */
  updateInfo(data: { title?: string; description?: string }): void {
    if (this.session.status === SessionStatus.ARCHIVED) {
      throw new Error('Cannot update archived session');
    }

    if (data.title !== undefined) {
      this.session.title = data.title;
    }
    if (data.description !== undefined) {
      this.session.description = data.description;
    }
  }

  /**
   * Get lessons sorted by lesson number
   */
  getLessonsSorted(): Lesson[] {
    return [...this.lessons].sort((a, b) => a.lesson_number - b.lesson_number);
  }
}

