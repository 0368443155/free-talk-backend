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
import { WebinarRoomService } from './webinar-room.service';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { CreateWebinarRoomDto } from './dto/create-webinar-room.dto';

@ApiTags('Webinar Rooms')
@Controller('rooms/webinar')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class WebinarRoomController {
  constructor(private readonly webinarRoomService: WebinarRoomService) {}

  @Post()
  @ApiOperation({ summary: 'Create a webinar room' })
  async createRoom(@Request() req, @Body() dto: CreateWebinarRoomDto) {
    return this.webinarRoomService.createRoom(
      req.user.id,
      dto.title,
      dto.description,
      dto.scheduledAt ? new Date(dto.scheduledAt) : undefined,
    );
  }

  @Post(':roomId/join')
  @ApiOperation({ summary: 'Join a webinar room' })
  async joinRoom(@Request() req, @Param('roomId') roomId: string) {
    await this.webinarRoomService.joinRoom(roomId, req.user.id);
    return { success: true, message: 'Joined webinar room successfully' };
  }

  @Get(':roomId')
  @ApiOperation({ summary: 'Get webinar room details' })
  async getRoomDetails(@Param('roomId') roomId: string) {
    return this.webinarRoomService.getRoomDetails(roomId);
  }
}

