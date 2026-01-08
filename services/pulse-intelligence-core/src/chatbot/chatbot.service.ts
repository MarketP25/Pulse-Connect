import { Injectable, Inject } from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';
import { CognitiveComputingService } from '../cognitive-computing/cognitive-computing.service';

interface ChatRequest {
  message: string;
  userId?: string;
  sessionId?: string;
  conversationHistory?: Array<{role: string, content: string}>;
}

interface ChatResponse {
  response: string;
  intent: string;
  confidence: number;
  suggestedActions?: any[];
  context?: any;
  poweredBy: string;
}

@Injectable()
export class ChatbotService {
  constructor(
    private readonly cognitiveService: CognitiveComputingService,
    @Inject('KAFKA_CLIENT') private readonly kafkaClient: ClientKafka,
  ) {}

  async processMessage(request: ChatRequest): Promise<ChatResponse> {
    try {
      // Use Cognitive Computing Service for conversational AI
      const aiResponse = await this.cognitiveService.handleConversationalAI(
        request.message,
        {
          userId: request.userId,
          sessionId: request.sessionId,
          conversationHistory: request.conversationHistory
        }
      );

      // Log conversation for analytics and improvement
      await this.logConversation(request, aiResponse);

      // Publish to Kafka for real-time analytics
      await this.publishConversationEvent(request, aiResponse);

      return {
        response: aiResponse.response,
        intent: aiResponse.intent,
        confidence: aiResponse.confidence,
        suggestedActions: aiResponse.suggestedActions,
        context: aiResponse.context,
        poweredBy: 'Pulse Intelligence Core - Cognitive Computing'
      };

    } catch (error) {
      console.error('Chatbot processing error:', error);

      // Fallback response using basic AI patterns
      return this.generateFallbackResponse(request);
    }
  }

  async analyzeMessage(message: string): Promise<any> {
    // Use Cognitive Computing Service for message analysis
    const analysis = await this.cognitiveService.performSemanticReasoning({
      criteria: 'message_analysis',
      message: message
    });

    return {
      intent: this.detectIntent(message),
      entities: this.extractEntities(message),
      sentiment: this.analyzeSentiment(message),
      urgency: this.assessUrgency(message),
      topics: this.identifyTopics(message),
      analysis: analysis
    };
  }

  private async logConversation(request: ChatRequest, response: any): Promise<void> {
    // Log conversation for training and analytics
    const logEntry = {
      timestamp: new Date().toISOString(),
      userId: request.userId,
      sessionId: request.sessionId,
      userMessage: request.message,
      aiResponse: response.response,
      intent: response.intent,
      confidence: response.confidence,
      context: response.context
    };

    // In production, this would be stored in a database
    console.log('Conversation logged:', logEntry);
  }

  private async publishConversationEvent(request: ChatRequest, response: any): Promise<void> {
    try {
      await this.kafkaClient.emit('conversation.events', {
        key: request.sessionId || 'anonymous',
        value: {
          userId: request.userId,
          sessionId: request.sessionId,
          message: request.message,
          response: response.response,
          intent: response.intent,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      console.warn('Failed to publish conversation event:', error);
    }
  }

  private generateFallbackResponse(request: ChatRequest): ChatResponse {
    // Basic fallback when Cognitive Computing Service is unavailable
    const lowerMessage = request.message.toLowerCase();

    let response = "I'm here to help you with Pulsco! ";
    let intent = 'general_inquiry';

    if (lowerMessage.includes('help')) {
      response += "Our AI-powered platform includes advanced features for matchmaking, secure transactions, and intelligent fraud detection.";
      intent = 'help_request';
    } else if (lowerMessage.includes('transaction') || lowerMessage.includes('payment')) {
      response += "All transactions are protected by our MARP governance firewall and PC365 authentication.";
      intent = 'transaction_inquiry';
    } else if (lowerMessage.includes('security') || lowerMessage.includes('safe')) {
      response += "Security is our highest priority with multi-layered protection and continuous monitoring.";
      intent = 'security_concern';
    } else {
      response += "How can I assist you with our AI-powered marketplace today?";
    }

    response += " All operations are governed by MARP and protected by PC365 authentication.";

    return {
      response,
      intent,
      confidence: 0.7,
      suggestedActions: [
        { type: 'navigate', label: 'Contact Support', target: '/support' }
      ],
      context: {
        topic: 'general',
        sentiment: 0,
        urgency: 'low',
        fallback: true
      },
      poweredBy: 'Pulse Intelligence Core - Fallback Mode'
    };
  }

  private detectIntent(message: string): string {
    const lowerMessage = message.toLowerCase();

    if (lowerMessage.includes('help') || lowerMessage.includes('support') || lowerMessage.includes('how')) {
      return 'help_request';
    }
    if (lowerMessage.includes('transaction') || lowerMessage.includes('payment') || lowerMessage.includes('money')) {
      return 'transaction_inquiry';
    }
    if (lowerMessage.includes('account') || lowerMessage.includes('profile') || lowerMessage.includes('settings')) {
      return 'account_management';
    }
    if (lowerMessage.includes('security') || lowerMessage.includes('safe') || lowerMessage.includes('fraud')) {
      return 'security_concern';
    }
    if (lowerMessage.includes('why') || lowerMessage.includes('explain') || lowerMessage.includes('reason')) {
      return 'platform_explanation';
    }
    if (lowerMessage.includes('problem') || lowerMessage.includes('issue') || lowerMessage.includes('error')) {
      return 'complaint';
    }

    return 'general_inquiry';
  }

  private extractEntities(message: string): any {
    return {
      amounts: message.match(/\$?\d+(\.\d{2})?/g) || [],
      dates: message.match(/\d{1,2}\/\d{1,2}\/\d{4}|\d{4}-\d{2}-\d{2}/g) || [],
      transactionIds: message.match(/TXN\d+|TRX\d+/gi) || [],
      userIds: message.match(/USER\d+|USR\d+/gi) || [],
      subsystems: this.detectSubsystems(message),
      actions: this.detectActions(message)
    };
  }

  private detectSubsystems(message: string): string[] {
    const subsystems = ['ecommerce', 'fraud', 'proximity', 'communication', 'payments', 'matchmaking'];
    return subsystems.filter(subsystem => message.toLowerCase().includes(subsystem));
  }

  private detectActions(message: string): string[] {
    const actions = ['transfer', 'send', 'receive', 'update', 'change', 'cancel', 'refund'];
    return actions.filter(action => message.toLowerCase().includes(action));
  }

  private analyzeSentiment(message: string): number {
    const positiveWords = ['good', 'great', 'excellent', 'happy', 'satisfied', 'thanks', 'helpful'];
    const negativeWords = ['bad', 'terrible', 'awful', 'angry', 'frustrated', 'problem', 'issue', 'wrong'];

    const positiveCount = positiveWords.filter(word => message.toLowerCase().includes(word)).length;
    const negativeCount = negativeWords.filter(word => message.toLowerCase().includes(word)).length;

    if (positiveCount > negativeCount) return 0.5;
    if (negativeCount > positiveCount) return -0.5;
    return 0;
  }

  private assessUrgency(message: string): string {
    const urgentKeywords = ['urgent', 'emergency', 'immediately', 'asap', 'critical', 'breach', 'hack'];
    const urgentIntents = ['security_concern', 'complaint'];

    if (urgentKeywords.some(keyword => message.toLowerCase().includes(keyword))) {
      return 'high';
    }

    return 'low';
  }

  private identifyTopics(message: string): string[] {
    const topics = {
      transactions: ['payment', 'transfer', 'money', 'transaction'],
      security: ['security', 'fraud', 'safe', 'hack', 'breach'],
      account: ['account', 'profile', 'settings', 'update'],
      platform: ['platform', 'feature', 'how', 'why', 'explain'],
      support: ['help', 'support', 'assist', 'guide']
    };

    const identifiedTopics = [];
    for (const [topic, keywords] of Object.entries(topics)) {
      if (keywords.some(keyword => message.toLowerCase().includes(keyword))) {
        identifiedTopics.push(topic);
      }
    }

    return identifiedTopics;
  }
}
