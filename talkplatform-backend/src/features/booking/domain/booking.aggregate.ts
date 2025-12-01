import { Booking, BookingStatus } from '../entities/booking.entity';
import { BookingSlot } from '../entities/booking-slot.entity';

/**
 * Booking Aggregate Root
 * Encapsulates booking business logic and invariants
 */
export class BookingAggregate {
  private booking: Booking;
  private slot: BookingSlot | null = null;

  constructor(booking: Booking, slot?: BookingSlot) {
    this.booking = booking;
    this.slot = slot || null;
  }

  // Getters
  get id(): string {
    return this.booking.id;
  }

  get studentId(): string {
    return this.booking.student_id;
  }

  get teacherId(): string {
    return this.booking.teacher_id;
  }

  get meetingId(): string {
    return this.booking.meeting_id;
  }

  get status(): BookingStatus {
    return this.booking.status;
  }

  get creditsPaid(): number {
    return this.booking.credits_paid;
  }

  get creditsRefunded(): number {
    return this.booking.credits_refunded;
  }

  get scheduledAt(): Date {
    return this.booking.scheduled_at;
  }

  get entity(): Booking {
    return this.booking;
  }

  get slotEntity(): BookingSlot | null {
    return this.slot;
  }

  // Business Logic Methods

  /**
   * Check if booking can be cancelled
   */
  canCancel(userId: string): { canCancel: boolean; reason?: string } {
    if (this.booking.status === BookingStatus.CANCELLED) {
      return { canCancel: false, reason: 'Booking is already cancelled' };
    }

    if (this.booking.status === BookingStatus.COMPLETED) {
      return { canCancel: false, reason: 'Cannot cancel completed booking' };
    }

    // Only student or teacher can cancel
    if (userId !== this.booking.student_id && userId !== this.booking.teacher_id) {
      return { canCancel: false, reason: 'Only student or teacher can cancel this booking' };
    }

    // Check if booking is too close to scheduled time (e.g., less than 24 hours)
    const now = new Date();
    const hoursUntilBooking = (this.booking.scheduled_at.getTime() - now.getTime()) / (1000 * 60 * 60);
    
    if (hoursUntilBooking < 24 && userId === this.booking.student_id) {
      return { canCancel: false, reason: 'Cannot cancel booking less than 24 hours before scheduled time' };
    }

    return { canCancel: true };
  }

  /**
   * Cancel the booking
   */
  cancel(userId: string, reason: string, refundCredits: number = 0): void {
    const validation = this.canCancel(userId);
    if (!validation.canCancel) {
      throw new Error(validation.reason || 'Cannot cancel booking');
    }

    this.booking.status = BookingStatus.CANCELLED;
    this.booking.cancelled_at = new Date();
    this.booking.cancellation_reason = reason;
    this.booking.cancelled_by = userId;
    this.booking.credits_refunded = refundCredits;

    // Free up the slot if exists
    if (this.slot) {
      this.slot.is_booked = false;
      this.slot.booking = null;
      this.slot.student_id = null;
    }
  }

  /**
   * Confirm the booking
   */
  confirm(): void {
    if (this.booking.status !== BookingStatus.PENDING) {
      throw new Error('Only pending bookings can be confirmed');
    }

    this.booking.status = BookingStatus.CONFIRMED;
  }

  /**
   * Complete the booking
   */
  complete(): void {
    if (this.booking.status !== BookingStatus.CONFIRMED) {
      throw new Error('Only confirmed bookings can be completed');
    }

    this.booking.status = BookingStatus.COMPLETED;
    this.booking.completed_at = new Date();
  }

  /**
   * Mark as no-show
   */
  markAsNoShow(): void {
    if (this.booking.status !== BookingStatus.CONFIRMED) {
      throw new Error('Only confirmed bookings can be marked as no-show');
    }

    this.booking.status = BookingStatus.NO_SHOW;
  }

  /**
   * Check if booking is active (not cancelled or completed)
   */
  isActive(): boolean {
    return (
      this.booking.status === BookingStatus.PENDING ||
      this.booking.status === BookingStatus.CONFIRMED
    );
  }

  /**
   * Check if booking is completed
   */
  isCompleted(): boolean {
    return this.booking.status === BookingStatus.COMPLETED;
  }

  /**
   * Check if booking is cancelled
   */
  isCancelled(): boolean {
    return this.booking.status === BookingStatus.CANCELLED;
  }

  /**
   * Calculate refund amount based on cancellation policy
   */
  calculateRefund(cancellationPolicy: 'full' | 'partial' | 'none' = 'partial'): number {
    if (cancellationPolicy === 'none') {
      return 0;
    }

    if (cancellationPolicy === 'full') {
      return this.booking.credits_paid;
    }

    // Partial refund: 50% if cancelled more than 24 hours before
    const now = new Date();
    const hoursUntilBooking = (this.booking.scheduled_at.getTime() - now.getTime()) / (1000 * 60 * 60);
    
    if (hoursUntilBooking >= 24) {
      return Math.floor(this.booking.credits_paid * 0.5);
    }

    return 0;
  }
}

