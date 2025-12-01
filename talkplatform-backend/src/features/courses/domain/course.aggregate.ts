import { Course, CourseStatus, PriceType, CourseCategory, CourseLevel } from '../entities/course.entity';
import { CourseSession } from '../entities/course-session.entity';

/**
 * Course Aggregate Root
 * Encapsulates course business logic and invariants
 */
export class CourseAggregate {
  private course: Course;
  private sessions: CourseSession[] = [];

  constructor(course: Course, sessions: CourseSession[] = []) {
    this.course = course;
    this.sessions = sessions;
  }

  // Getters
  get id(): string {
    return this.course.id;
  }

  get teacherId(): string {
    return this.course.teacher_id;
  }

  get title(): string {
    return this.course.title;
  }

  get status(): CourseStatus {
    return this.course.status;
  }

  get isPublished(): boolean {
    return this.course.is_published;
  }

  get currentStudents(): number {
    return this.course.current_students;
  }

  get maxStudents(): number {
    return this.course.max_students;
  }

  get priceType(): PriceType {
    return this.course.price_type;
  }

  get price(): number {
    return this.course.price;
  }

  get totalSessions(): number {
    return this.course.total_sessions;
  }

  get entity(): Course {
    return this.course;
  }

  get sessionList(): CourseSession[] {
    return [...this.sessions];
  }

  // Business Logic Methods

  /**
   * Check if course can be published
   */
  canPublish(): { canPublish: boolean; reason?: string } {
    if (this.course.status === CourseStatus.PUBLISHED) {
      return { canPublish: false, reason: 'Course is already published' };
    }

    if (this.course.status === CourseStatus.ARCHIVED) {
      return { canPublish: false, reason: 'Cannot publish archived course' };
    }

    if (!this.course.title || this.course.title.trim().length === 0) {
      return { canPublish: false, reason: 'Course title is required' };
    }

    if (this.sessions.length === 0) {
      return { canPublish: false, reason: 'Course must have at least one session' };
    }

    // Check if all sessions have at least one lesson
    const sessionsWithoutLessons = this.sessions.filter(
      session => !session.lessons || session.lessons.length === 0,
    );
    if (sessionsWithoutLessons.length > 0) {
      return { canPublish: false, reason: 'All sessions must have at least one lesson' };
    }

    // Validate pricing
    if (this.course.price_type === PriceType.PER_SESSION) {
      if (!this.course.price_per_session || this.course.price_per_session < 1) {
        return { canPublish: false, reason: 'Price per session must be at least $1.00' };
      }
    } else if (this.course.price_type === PriceType.FULL_COURSE) {
      if (!this.course.price_full_course || this.course.price_full_course < 1) {
        return { canPublish: false, reason: 'Full course price must be at least $1.00' };
      }
    }

    return { canPublish: true };
  }

  /**
   * Publish the course
   */
  publish(): void {
    const validation = this.canPublish();
    if (!validation.canPublish) {
      throw new Error(validation.reason || 'Cannot publish course');
    }

    this.course.status = CourseStatus.PUBLISHED;
    this.course.is_published = true;
  }

  /**
   * Unpublish the course
   */
  unpublish(): void {
    this.course.status = CourseStatus.DRAFT;
    this.course.is_published = false;
  }

  /**
   * Archive the course
   */
  archive(): void {
    if (this.course.status === CourseStatus.PUBLISHED && this.course.current_students > 0) {
      throw new Error('Cannot archive course with enrolled students');
    }
    this.course.status = CourseStatus.ARCHIVED;
  }

  /**
   * Check if course has available slots
   */
  hasAvailableSlots(): boolean {
    return this.course.current_students < this.course.max_students;
  }

  /**
   * Get available slots count
   */
  getAvailableSlots(): number {
    return Math.max(0, this.course.max_students - this.course.current_students);
  }

  /**
   * Enroll a student
   */
  enrollStudent(): void {
    if (!this.hasAvailableSlots()) {
      throw new Error('Course is full');
    }
    this.course.current_students += 1;
  }

  /**
   * Unenroll a student
   */
  unenrollStudent(): void {
    if (this.course.current_students <= 0) {
      throw new Error('No students to unenroll');
    }
    this.course.current_students -= 1;
  }

  /**
   * Add a session to the course
   */
  addSession(session: CourseSession): void {
    if (this.course.status === CourseStatus.ARCHIVED) {
      throw new Error('Cannot add session to archived course');
    }
    this.sessions.push(session);
    this.course.total_sessions = this.sessions.length;
  }

  /**
   * Remove a session from the course
   */
  removeSession(sessionId: string): void {
    if (this.course.status === CourseStatus.PUBLISHED) {
      throw new Error('Cannot remove session from published course');
    }
    this.sessions = this.sessions.filter(s => s.id !== sessionId);
    this.course.total_sessions = this.sessions.length;
  }

  /**
   * Update course basic information
   */
  updateBasicInfo(data: {
    title?: string;
    description?: string;
    language?: string;
    level?: CourseLevel;
    category?: CourseCategory;
    tags?: string[];
  }): void {
    if (this.course.status === CourseStatus.PUBLISHED) {
      // Only allow limited updates to published courses
      if (data.description !== undefined) {
        this.course.description = data.description;
      }
      if (data.tags !== undefined) {
        this.course.tags = data.tags;
      }
    } else {
      // Allow all updates for draft courses
      if (data.title !== undefined) {
        this.course.title = data.title;
      }
      if (data.description !== undefined) {
        this.course.description = data.description;
      }
      if (data.language !== undefined) {
        this.course.language = data.language;
      }
      if (data.level !== undefined) {
        this.course.level = data.level;
      }
      if (data.category !== undefined) {
        this.course.category = data.category;
      }
      if (data.tags !== undefined) {
        this.course.tags = data.tags;
      }
    }
  }

  /**
   * Update pricing
   */
  updatePricing(priceType: PriceType, pricePerSession?: number, priceFullCourse?: number): void {
    if (this.course.status === CourseStatus.PUBLISHED && this.course.current_students > 0) {
      throw new Error('Cannot change pricing for published course with enrolled students');
    }

    this.course.price_type = priceType;
    if (priceType === PriceType.PER_SESSION) {
      if (!pricePerSession || pricePerSession < 1) {
        throw new Error('Price per session must be at least $1.00');
      }
      this.course.price_per_session = pricePerSession;
      this.course.price_full_course = null as any;
    } else {
      if (!priceFullCourse || priceFullCourse < 1) {
        throw new Error('Full course price must be at least $1.00');
      }
      this.course.price_full_course = priceFullCourse;
      this.course.price_per_session = null as any;
    }
  }
}

