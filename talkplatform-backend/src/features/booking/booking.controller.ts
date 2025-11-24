import {
  Controller,
  Post,
  Get,
  Patch,
  Param,
  Body,
  UseGuards,
  Request,
  NotFoundException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { BookingService } from './booking.service';
import { CreateBookingDto, CancelBookingDto } from './dto/create-booking.dto';

@Controller('api/v1/bookings')
@UseGuards(JwtAuthGuard)
export class BookingController {
  constructor(private readonly bookingService: BookingService) {}

  /**
   * Đặt lịch
   * POST /api/v1/bookings
   */
  @Post()
  async createBooking(@Body() dto: CreateBookingDto, @Request() req) {
    return await this.bookingService.createBooking(dto, req.user);
  }

  /**
   * Lấy danh sách bookings của tôi
   * GET /api/v1/bookings/my-bookings
   */
  @Get('my-bookings')
  async getMyBookings(@Request() req) {
    const role = req.user.role === 'teacher' ? 'teacher' : 'student';
    return await this.bookingService.getMyBookings(req.user.id, role);
  }

  /**
   * Lấy booking theo ID
   * GET /api/v1/bookings/:id
   */
  @Get(':id')
  async getBooking(@Param('id') id: string, @Request() req) {
    return await this.bookingService.findOne(id, req.user.id);
  }

  /**
   * Hủy booking
   * PATCH /api/v1/bookings/:id/cancel
   */
  @Patch(':id/cancel')
  async cancelBooking(
    @Param('id') id: string,
    @Body() dto: CancelBookingDto,
    @Request() req,
  ) {
    return await this.bookingService.cancelBooking(id, req.user.id, dto);
  }

  /**
   * Lấy danh sách bookings của teacher
   * GET /api/v1/bookings/teacher-bookings
   */
  @Get('teacher-bookings')
  async getTeacherBookings(@Request() req) {
    return await this.bookingService.getMyBookings(req.user.id, 'teacher');
  }
}


