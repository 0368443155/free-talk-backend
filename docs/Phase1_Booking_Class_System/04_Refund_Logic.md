# REFUND LOGIC - LOGIC HOÀN TIỀN TỰ ĐỘNG

**Ngày tạo:** 03/12/2025  
**File:** 04_Refund_Logic.md  
**Thời gian:** 2 ngày

---

## 🎯 MỤC TIÊU

Tự động hoàn tiền cho students khi teacher hủy lịch đã có người đặt.

---

## 📋 REFUND POLICY

### 1. Refund Amount
- **>24 giờ trước lớp:** 100% refund
- **<24 giờ trước lớp:** 50% refund
- **Teacher hủy:** Full refund (100%)
- **Student hủy:** Theo policy trên

### 2. Refund Process
- Tự động refund credits vào wallet
- Ghi log transaction
- Notify user về refund
- Update booking status

---

## 💻 IMPLEMENTATION

### Refund Service

```typescript
// File: src/features/booking/refund.service.ts

import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Booking, BookingStatus } from './entities/booking.entity';
import { WalletService } from '../wallet/wallet.service';
import { NotificationService } from '../notifications/notification.service';
import { differenceInHours } from 'date-fns';

export interface RefundResult {
  refundAmount: number;
  refundPercentage: number;
  reason: string;
}

@Injectable()
export class RefundService {
  private readonly logger = new Logger(RefundService.name);

  constructor(
    @InjectRepository(Booking)
    private readonly bookingRepository: Repository<Booking>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly walletService: WalletService,
    private readonly notificationService: NotificationService,
  ) {}

  /**
   * Refund một booking
   */
  async refundBooking(
    bookingId: string,
    cancelledBy: string,
    reason: string
  ): Promise<RefundResult> {
    return await this.dataSource.transaction(async (manager) => {
      // 1. Get booking
      const booking = await manager.findOne(Booking, {
        where: { id: bookingId },
        relations: ['meeting', 'student', 'teacher'],
      });

      if (!booking) {
        throw new Error('Booking not found');
      }

      if (booking.status === BookingStatus.CANCELLED) {
        throw new Error('Booking already cancelled');
      }

      // 2. Calculate refund amount (UTC-based)
      const now = new Date(); // Server time (UTC)
      const scheduledAt = new Date(booking.scheduled_at); // DB stores UTC
      
      // Tính khoảng cách giờ chính xác
      const hoursUntilClass = differenceInHours(scheduledAt, now);

      let refundPercentage: number;
      
      // Teacher hủy = full refund
      if (cancelledBy === booking.teacher_id) {
        refundPercentage = 1.0;
        this.logger.log(`Teacher cancelled, full refund for booking ${bookingId}`);
      } 
      // Student hủy = theo policy
      else {
        // Policy: > 24h = 100%, < 24h = 50%
        // Edge case: 23h 59m 59s -> Tính là < 24h
        // Sử dụng strict comparison
        refundPercentage = hoursUntilClass >= 24 ? 1.0 : 0.5;
        
        this.logger.log(
          `Student cancelled ${hoursUntilClass}h before class, ${refundPercentage * 100}% refund`
        );
      }

      const refundAmount = Math.floor(booking.credits_paid * refundPercentage);

      // 3. Refund credits
      await this.walletService.addCredits(
        booking.student_id,
        refundAmount,
        `Refund for booking ${bookingId}: ${reason}`,
        bookingId,
        { 
          refundPercentage,
          originalAmount: booking.credits_paid,
          cancelledBy,
        }
      );

      // 4. Update booking
      booking.status = BookingStatus.CANCELLED;
      booking.credits_refunded = refundAmount;
      booking.cancellation_reason = reason;
      booking.cancelled_by = cancelledBy;
      booking.cancelled_at = new Date();
      await manager.save(booking);

      // 5. Notify student
      await this.notificationService.send({
        userId: booking.student_id,
        type: 'EMAIL',
        title: 'Booking Cancelled - Refund Processed',
        message: `Your booking for "${booking.meeting.title}" has been cancelled. ${refundAmount} credits have been refunded to your account.`,
        data: {
          bookingId: booking.id,
          refundAmount,
          refundPercentage: refundPercentage * 100,
        },
      });

      this.logger.log(
        `Refunded ${refundAmount} credits (${refundPercentage * 100}%) for booking ${bookingId}`
      );

      return {
        refundAmount,
        refundPercentage,
        reason,
      };
    });
  }

  /**
   * Refund tất cả bookings của một meeting (khi teacher hủy lớp)
   */
  async refundAllBookings(
    meetingId: string,
    teacherId: string,
    reason: string
  ): Promise<{ refundedCount: number; totalRefunded: number }> {
    const bookings = await this.bookingRepository.find({
      where: {
        meeting_id: meetingId,
        status: BookingStatus.CONFIRMED,
      },
    });

    let totalRefunded = 0;

    for (const booking of bookings) {
      try {
        const result = await this.refundBooking(booking.id, teacherId, reason);
        totalRefunded += result.refundAmount;
      } catch (error) {
        this.logger.error(`Failed to refund booking ${booking.id}:`, error);
      }
    }

    return {
      refundedCount: bookings.length,
      totalRefunded,
    };
  }
}
```

### Controller Update

```typescript
// File: src/features/booking/booking.controller.ts

@Patch(':id/cancel')
async cancelBooking(
  @Param('id') id: string,
  @Body() dto: CancelBookingDto,
  @Request() req
) {
  const result = await this.refundService.refundBooking(
    id,
    req.user.id,
    dto.reason || 'User cancelled'
  );

  return {
    message: 'Booking cancelled successfully',
    refundAmount: result.refundAmount,
    refundPercentage: result.refundPercentage * 100,
  };
}
```

---

## 🧪 TESTING

```typescript
// Test cases
describe('RefundService', () => {
  it('should refund 100% if >24h before class', async () => {
    // Create booking with scheduled_at = now + 48h
    // Cancel booking
    // Expect refund = 100%
  });

  it('should refund 50% if <24h before class', async () => {
    // Create booking with scheduled_at = now + 12h
    // Cancel booking
    // Expect refund = 50%
  });

  it('should refund 100% if teacher cancels', async () => {
    // Create booking
    // Teacher cancels
    // Expect refund = 100%
  });
});
```

---

**Next:** `05_Calendar_UI.md`
