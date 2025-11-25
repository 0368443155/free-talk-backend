import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { GlobalChatService } from './global-chat.service';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { GlobalMessageType } from './entities/global-chat-message.entity';

@ApiTags('Global Chat')
@Controller('global-chat')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class GlobalChatController {
  constructor(private readonly globalChatService: GlobalChatService) {}

  @Get('messages')
  @ApiOperation({ summary: 'Get global chat messages' })
  @ApiResponse({ status: 200, description: 'Messages retrieved successfully' })
  async getMessages(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('before') before?: string,
  ) {
    try {
      const beforeDate = before ? new Date(before) : undefined;
      return await this.globalChatService.getMessages({
        page: page ? Number(page) : 1,
        limit: limit ? Number(limit) : 50,
        before: beforeDate,
      });
    } catch (error) {
      // Service already handles errors and returns empty result
      // But if it still throws, return empty result here too
      return {
        data: [],
        total: 0,
        page: page ? Number(page) : 1,
        limit: limit ? Number(limit) : 50,
        totalPages: 0,
      };
    }
  }

  @Post('messages')
  @ApiOperation({ summary: 'Send a message to global chat' })
  @ApiResponse({ status: 201, description: 'Message sent successfully' })
  async sendMessage(
    @Request() req,
    @Body() body: { message: string; type?: GlobalMessageType; metadata?: any },
  ) {
    if (!req.user || !req.user.id) {
      throw new Error('User not authenticated');
    }
    return this.globalChatService.createMessage(
      req.user.id,
      body.message,
      body.type || GlobalMessageType.TEXT,
      body.metadata,
    );
  }

  @Delete('messages/:id')
  @ApiOperation({ summary: 'Delete a message (admin or owner only)' })
  @ApiResponse({ status: 200, description: 'Message deleted successfully' })
  async deleteMessage(@Request() req, @Param('id') id: string) {
    await this.globalChatService.deleteMessage(id, req.user.id);
    return { message: 'Message deleted successfully' };
  }

  @Get('messages/:id')
  @ApiOperation({ summary: 'Get a specific message by ID' })
  @ApiResponse({ status: 200, description: 'Message retrieved successfully' })
  async getMessage(@Param('id') id: string) {
    return this.globalChatService.getMessageById(id);
  }
}

