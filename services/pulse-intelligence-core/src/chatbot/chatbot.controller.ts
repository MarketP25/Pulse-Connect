import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { SecureChatbotService } from './secure-chatbot.service';
import { PC365Guard } from '../../../shared/lib/src/pc365Guard';

interface SecureChatRequest {
  message: string;
  userId?: string;
  sessionId?: string;
  conversationHistory?: Array<{role: string, content: string}>;
  userPermissions?: string[];
  userRole?: string;
}

@Controller('chatbot')
@UseGuards(PC365Guard)
export class ChatbotController {
  constructor(private readonly chatbotService: SecureChatbotService) {}

  @Post('message')
  async processMessage(@Body() request: SecureChatRequest) {
    return this.chatbotService.processMessage(request);
  }

  @Post('analyze')
  async analyzeMessage(@Body() body: { message: string }) {
    return this.chatbotService.analyzeMessage(body.message);
  }
}
