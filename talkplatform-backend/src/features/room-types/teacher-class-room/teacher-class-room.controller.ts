import {
  Controller,
  Post,
  Get,
  Param,
  UseGuards,
  Request,
  Body,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { TeacherClassRoomService } from './teacher-class-room.service';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { CreateTeacherClassRoomDto } from './dto/create-teacher-class-room.dto';

@ApiTags('Teacher Class Rooms')
@Controller('rooms/teacher-class')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class TeacherClassRoomController {
  constructor(
    private readonly teacherClassRoomService: TeacherClassRoomService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a teacher class room' })
  async createRoom(@Request() req, @Body() dto: CreateTeacherClassRoomDto) {
    return this.teacherClassRoomService.createRoom(
      req.user.id,
      dto.title,
      dto.description,
      dto.scheduledAt ? new Date(dto.scheduledAt) : undefined,
    );
  }

  @Post(':roomId/join')
  @ApiOperation({ summary: 'Join a teacher class room' })
  async joinRoom(@Request() req, @Param('roomId') roomId: string) {
    await this.teacherClassRoomService.joinRoom(roomId, req.user.id);
    return { success: true, message: 'Joined teacher class room successfully' };
  }

  @Get(':roomId')
  @ApiOperation({ summary: 'Get teacher class room details' })
  async getRoomDetails(@Param('roomId') roomId: string) {
    return this.teacherClassRoomService.getRoomDetails(roomId);
  }
}

