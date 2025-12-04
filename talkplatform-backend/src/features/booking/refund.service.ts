import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Booking, BookingStatus } from './entities/booking.entity';
import { BookingSlot } from './entities/booking-slot.entity';
import { WalletService } from '../wallet/wallet.service';
import { NotificationService } from '../notifications/notification.service';
import { NotificationType } from '../notifications/entities/notification.entity';
import { EntryType } from '../wallet/entities/ledger-entry.entity';

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
        @InjectRepository(BookingSlot)
        private readonly slotRepository: Repository<BookingSlot>,
        @InjectDataSource()
        private readonly dataSource: DataSource,
        private readonly walletService: WalletService,
        private readonly notificationService: NotificationService,
    ) { }

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
            const diffInMs = scheduledAt.getTime() - now.getTime();
            const hoursUntilClass = diffInMs / (1000 * 60 * 60);

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
                    `Student cancelled ${hoursUntilClass.toFixed(2)}h before class, ${refundPercentage * 100}% refund`
                );
            }

            const refundAmount = Math.floor(booking.credits_paid * refundPercentage);

            // 3. Refund credits
            if (refundAmount > 0) {
                // Refund from Escrow to Student
                await this.walletService.createTransaction(
                    [
                        {
                            account_id: 'escrow',
                            entry_type: EntryType.DEBIT, // Giảm Escrow
                            amount: refundAmount,
                            description: `Refund to student ${booking.student_id}`,
                        },
                        {
                            account_id: `user-${booking.student_id}`,
                            entry_type: EntryType.CREDIT, // Tăng Student
                            amount: refundAmount,
                            description: `Refund for booking ${bookingId}`,
                        }
                    ],
                    `Refund for booking ${bookingId}: ${reason}`,
                    'refund',
                    bookingId,
                    {
                        refundPercentage,
                        originalAmount: booking.credits_paid,
                        cancelledBy,
                    }
                );
            }

            // 4. Update booking
            booking.status = BookingStatus.CANCELLED;
            booking.credits_refunded = refundAmount;
            booking.cancellation_reason = reason;
            booking.cancelled_by = cancelledBy;
            booking.cancelled_at = new Date();
            await manager.save(booking);

            // 5. Release slot
            const slot = await manager.findOne(BookingSlot, {
                where: { booking_id: bookingId },
            });

            if (slot) {
                slot.is_booked = false;
                slot.booking = null;
                slot.student_id = null;
                await manager.save(BookingSlot, slot);
            }

            // 6. Notify student
            await this.notificationService.send({
                userId: booking.student_id,
                type: NotificationType.EMAIL,
                title: 'Booking Cancelled - Refund Processed',
                message: `Your booking for "${booking.meeting?.title || 'Class'}" has been cancelled. ${refundAmount} credits have been refunded to your account.`,
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
