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
import { LessonRoomService } from './lesson-room.service';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { CreateLessonRoomDto } from './dto/create-lesson-room.dto';

@ApiTags('Lesson Rooms')
@Controller('rooms/lesson')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class LessonRoomController {
  constructor(private readonly lessonRoomService: LessonRoomService) {}

  @Post()
  @ApiOperation({ summary: 'Create a lesson room' })
  async createRoom(@Request() req, @Body() dto: CreateLessonRoomDto) {
    return this.lessonRoomService.createRoom(
      req.user.id,
      dto.lessonId,
      dto.title,
    );
  }

  @Post(':roomId/join')
  @ApiOperation({ summary: 'Join a lesson room' })
  async joinRoom(@Request() req, @Param('roomId') roomId: string) {
    await this.lessonRoomService.joinRoom(roomId, req.user.id);
    return { success: true, message: 'Joined lesson room successfully' };
  }

  @Get(':roomId')
  @ApiOperation({ summary: 'Get lesson room details' })
  async getRoomDetails(@Param('roomId') roomId: string) {
    return this.lessonRoomService.getRoomDetails(roomId);
  }
}

