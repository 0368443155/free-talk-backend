import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { FreeTalkRoomService } from './free-talk-room.service';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { CreateFreeTalkRoomDto } from './dto/create-free-talk-room.dto';

@ApiTags('Free Talk Rooms')
@Controller('rooms/free-talk')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class FreeTalkRoomController {
  constructor(private readonly freeTalkRoomService: FreeTalkRoomService) {}

  @Post()
  @ApiOperation({ summary: 'Create a free talk room' })
  async createRoom(@Request() req, @Body() dto: CreateFreeTalkRoomDto) {
    return this.freeTalkRoomService.createRoom(
      req.user.id,
      dto.title,
      dto.description,
    );
  }

  @Post(':roomId/join')
  @ApiOperation({ summary: 'Join a free talk room' })
  async joinRoom(@Request() req, @Param('roomId') roomId: string) {
    await this.freeTalkRoomService.joinRoom(roomId, req.user.id);
    return { success: true, message: 'Joined room successfully' };
  }

  @Get(':roomId')
  @ApiOperation({ summary: 'Get free talk room details' })
  async getRoomDetails(@Param('roomId') roomId: string) {
    return this.freeTalkRoomService.getRoomDetails(roomId);
  }
}

