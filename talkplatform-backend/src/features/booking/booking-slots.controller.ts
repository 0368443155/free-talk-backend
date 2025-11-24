import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  Request,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { RolesGuard } from '../../core/auth/guards/roles.guard';
import { Roles } from '../../auth/roles.decorator';
import { UserRole } from '../../users/user.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BookingSlot } from './entities/booking-slot.entity';
import { TeacherProfile } from '../teachers/entities/teacher-profile.entity';

export interface CreateBookingSlotDto {
  date: string; // ISO date string (YYYY-MM-DD)
  start_time: string; // HH:mm format
  end_time: string; // HH:mm format
  price_credits: number;
}

@Controller('api/v1/teachers')
@UseGuards(JwtAuthGuard)
export class BookingSlotsController {
  constructor(
    @InjectRepository(BookingSlot)
    private readonly slotRepository: Repository<BookingSlot>,
    @InjectRepository(TeacherProfile)
    private readonly teacherProfileRepository: Repository<TeacherProfile>,
  ) {}

  /**
   * Tạo booking slot (Teacher only)
   * POST /api/v1/teachers/me/slots
   */
  @Post('me/slots')
  @UseGuards(RolesGuard)
  @Roles(UserRole.TEACHER)
  async createSlot(@Body() dto: CreateBookingSlotDto, @Request() req) {
    // Kiểm tra teacher profile tồn tại
    const profile = await this.teacherProfileRepository.findOne({
      where: { user_id: req.user.id },
    });

    if (!profile) {
      throw new NotFoundException('Teacher profile not found');
    }

    // Validate time
    if (dto.start_time >= dto.end_time) {
      throw new BadRequestException('End time must be after start time');
    }

    // Validate date (không được tạo slot trong quá khứ)
    const slotDate = new Date(dto.date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    slotDate.setHours(0, 0, 0, 0);
    if (slotDate < today) {
      throw new BadRequestException('Cannot create slots in the past');
    }

    const slot = this.slotRepository.create({
      teacher_id: req.user.id,
      date: slotDate, // Convert to Date object
      start_time: dto.start_time,
      end_time: dto.end_time,
      price_credits: dto.price_credits,
      is_booked: false,
    });

    return await this.slotRepository.save(slot);
  }

  /**
   * Lấy danh sách slots của tôi (Teacher)
   * GET /api/v1/teachers/me/slots
   */
  @Get('me/slots')
  @UseGuards(RolesGuard)
  @Roles(UserRole.TEACHER)
  async getMySlots(@Request() req) {
    return await this.slotRepository.find({
      where: { teacher_id: req.user.id },
      order: { date: 'ASC', start_time: 'ASC' },
    });
  }

  /**
   * Xóa slot (Teacher only, chỉ khi chưa được book)
   * DELETE /api/v1/teachers/me/slots/:id
   */
  @Delete('me/slots/:id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.TEACHER)
  async deleteSlot(@Param('id') id: string, @Request() req) {
    const slot = await this.slotRepository.findOne({
      where: { id, teacher_id: req.user.id },
    });

    if (!slot) {
      throw new NotFoundException('Slot not found');
    }

    if (slot.is_booked) {
      throw new BadRequestException('Cannot delete a booked slot');
    }

    await this.slotRepository.remove(slot);
    return { message: 'Slot deleted successfully' };
  }

  /**
   * Lấy available slots của một teacher (Public)
   * GET /api/v1/teachers/slots/available
   */
  @Get('slots/available')
  async getAvailableSlots(
    @Query('teacher_id') teacherId: string,
    @Query('date') date?: string,
    @Query('start_date') startDate?: string,
    @Query('end_date') endDate?: string,
  ) {
    if (!teacherId) {
      throw new BadRequestException('teacher_id is required');
    }

    const queryBuilder = this.slotRepository
      .createQueryBuilder('slot')
      .where('slot.teacher_id = :teacherId', { teacherId })
      .andWhere('slot.is_booked = false');

    if (date) {
      queryBuilder.andWhere('slot.date = :date', { date });
    } else if (startDate && endDate) {
      queryBuilder.andWhere('slot.date >= :startDate', { startDate });
      queryBuilder.andWhere('slot.date <= :endDate', { endDate });
    } else {
      // Mặc định: chỉ lấy slots từ hôm nay trở đi
      const today = new Date().toISOString().split('T')[0];
      queryBuilder.andWhere('slot.date >= :today', { today });
    }

    queryBuilder.orderBy('slot.date', 'ASC').addOrderBy('slot.start_time', 'ASC');

    return await queryBuilder.getMany();
  }
}

