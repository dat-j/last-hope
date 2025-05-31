import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ChatService } from './chat.service';
import { ProcessMessageDto } from './dto/chat.dto';

@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post('message')
  @HttpCode(HttpStatus.OK)
  async processMessage(@Body() processMessageDto: ProcessMessageDto) {
    return this.chatService.processMessage(
      processMessageDto.facebookUserId,
      processMessageDto.message,
      processMessageDto.workflowId,
    );
  }

  @Get('history/:facebookUserId')
  async getChatHistory(
    @Param('facebookUserId') facebookUserId: string,
    @Query('limit') limit: number = 50,
  ) {
    return this.chatService.getChatHistory(facebookUserId, limit);
  }

  @Get('session/:sessionId/history')
  async getSessionHistory(@Param('sessionId') sessionId: string) {
    return this.chatService.getSessionHistory(sessionId);
  }

  @Post('session/:sessionId/end')
  @HttpCode(HttpStatus.NO_CONTENT)
  async endSession(@Param('sessionId') sessionId: string) {
    return this.chatService.endSession(sessionId);
  }

  @Post('reset/:facebookUserId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async resetSession(@Param('facebookUserId') facebookUserId: string) {
    return this.chatService.resetSession(facebookUserId);
  }
} 