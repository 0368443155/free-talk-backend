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
import { InterviewRoomService } from './interview-room.service';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { CreateInterviewRoomDto } from './dto/create-interview-room.dto';

@ApiTags('Interview Rooms')
@Controller('rooms/interview')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class InterviewRoomController {
  constructor(
    private readonly interviewRoomService: InterviewRoomService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create an interview room' })
  async createRoom(@Request() req, @Body() dto: CreateInterviewRoomDto) {
    return this.interviewRoomService.createRoom(
      req.user.id,
      dto.intervieweeId,
      dto.title,
    );
  }

  @Post(':roomId/join')
  @ApiOperation({ summary: 'Join an interview room' })
  async joinRoom(@Request() req, @Param('roomId') roomId: string) {
    await this.interviewRoomService.joinRoom(roomId, req.user.id);
    return { success: true, message: 'Joined interview room successfully' };
  }

  @Get(':roomId')
  @ApiOperation({ summary: 'Get interview room details' })
  async getRoomDetails(@Param('roomId') roomId: string) {
    return this.interviewRoomService.getRoomDetails(roomId);
  }
}

