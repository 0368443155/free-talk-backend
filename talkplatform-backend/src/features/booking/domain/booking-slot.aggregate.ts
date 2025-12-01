import { BookingSlot } from '../entities/booking-slot.entity';

/**
 * Booking Slot Aggregate
 * Encapsulates booking slot business logic
 */
export class BookingSlotAggregate {
  private slot: BookingSlot;

  constructor(slot: BookingSlot) {
    this.slot = slot;
  }

  // Getters
  get id(): string {
    return this.slot.id;
  }

  get teacherId(): string {
    return this.slot.teacher_id;
  }

  get date(): Date {
    return this.slot.date;
  }

  get startTime(): string {
    return this.slot.start_time;
  }

  get endTime(): string {
    return this.slot.end_time;
  }

  get priceCredits(): number {
    return this.slot.price_credits;
  }

  get isBooked(): boolean {
    return this.slot.is_booked;
  }

  get studentId(): string | null {
    return this.slot.student_id;
  }

  get bookingId(): string | null {
    return this.slot.booking?.id || null;
  }

  get entity(): BookingSlot {
    return this.slot;
  }

  // Business Logic Methods

  /**
   * Check if slot is available for booking
   */
  isAvailable(): { available: boolean; reason?: string } {
    if (this.slot.is_booked) {
      return { available: false, reason: 'Slot is already booked' };
    }

    // Check if slot is in the past
    const now = new Date();
    const slotDateTime = new Date(`${this.slot.date.toISOString().split('T')[0]}T${this.slot.start_time}`);
    
    if (slotDateTime < now) {
      return { available: false, reason: 'Slot is in the past' };
    }

    return { available: true };
  }

  /**
   * Book the slot
   */
  book(studentId: string, bookingId: string): void {
    const validation = this.isAvailable();
    if (!validation.available) {
      throw new Error(validation.reason || 'Slot is not available');
    }

    this.slot.is_booked = true;
    this.slot.student_id = studentId;
    // Note: booking relationship will be set by repository
  }

  /**
   * Release the slot (unbook)
   */
  release(): void {
    if (!this.slot.is_booked) {
      throw new Error('Slot is not booked');
    }

    this.slot.is_booked = false;
    this.slot.student_id = null;
    this.slot.booking = null;
  }

  /**
   * Check if slot belongs to teacher
   */
  belongsToTeacher(teacherId: string): boolean {
    return this.slot.teacher_id === teacherId;
  }

  /**
   * Get slot datetime
   */
  getSlotDateTime(): Date {
    const [hours, minutes] = this.slot.start_time.split(':');
    const date = new Date(this.slot.date);
    date.setHours(parseInt(hours), parseInt(minutes), 0, 0);
    return date;
  }

  /**
   * Check if slot is in the past
   */
  isPast(): boolean {
    return this.getSlotDateTime() < new Date();
  }

  /**
   * Check if slot is upcoming
   */
  isUpcoming(): boolean {
    return this.getSlotDateTime() > new Date();
  }
}

