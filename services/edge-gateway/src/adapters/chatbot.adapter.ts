import { Injectable, Logger } from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';
import { EdgeTelemetryService } from '../services/telemetry.service';
import { AiRuleInterpreter } from '@/shared/lib/src/ai-rule-interpreter';

export interface ChatbotRequest {
  sessionId: string;
  userId: string;
  message: string;
  context: any;
  regionCode: string;
  intent?: string;
}

export interface ChatbotResponse {
  sessionId: string;
  response: string;
  allowed: boolean;
  blockedReason?: string;
  safetyFlags: string[];
  confidence: number;
  processingTime: number;
}

@Injectable()
export class ChatbotAdapter {
  private readonly logger = new Logger(ChatbotAdapter.name);

  constructor(
    private readonly kafkaClient: ClientKafka,
    private readonly telemetryService: EdgeTelemetryService,
    private readonly aiRuleInterpreter: AiRuleInterpreter,
  ) {}

  /**
   * Process chatbot interaction through Edge governance
   */
  async processChatbotRequest(request: ChatbotRequest): Promise<ChatbotResponse> {
    const startTime = Date.now();

    try {
      // 1. Pre-flight safety and intent analysis
      const safetyAnalysis = await this.aiRuleInterpreter.analyzeChatbotSafety({
        message: request.message,
        context: request.context,
        userId: request.userId,
        regionCode: request.regionCode,
      });

      // 2. Check for blocked intents or unsafe content
      if (!safetyAnalysis.allowed) {
        await this.telemetryService.recordEvent('chatbot_blocked', {
          sessionId: request.sessionId,
          userId: request.userId,
          reason: safetyAnalysis.blockedReason,
          safetyFlags: safetyAnalysis.flags,
        });

        return {
          sessionId: request.sessionId,
          response: this.getSafeFallbackResponse(safetyAnalysis.blockedReason),
          allowed: false,
          blockedReason: safetyAnalysis.blockedReason,
          safetyFlags: safetyAnalysis.flags,
          confidence: 0,
          processingTime: Date.now() - startTime,
        };
      }

      // 3. Apply rate limiting and throttling
      const rateCheck = await this.checkRateLimits(request.userId, request.regionCode);
      if (!rateCheck.allowed) {
        return {
          sessionId: request.sessionId,
          response: 'I\'m currently receiving too many requests. Please try again in a moment.',
          allowed: false,
          blockedReason: 'Rate limit exceeded',
          safetyFlags: ['rate_limited'],
          confidence: 0,
          processingTime: Date.now() - startTime,
        };
      }

      // 4. Execute chatbot response
      const chatbotResult = await this.executeChatbot(request);

      // 5. Post-process response for safety
      const finalResponse = await this.postProcessResponse(chatbotResult, safetyAnalysis);

      // 6. Record detailed telemetry
      await this.telemetryService.recordEvent('chatbot_response', {
        sessionId: request.sessionId,
        userId: request.userId,
        regionCode: request.regionCode,
        intent: request.intent,
        responseLength: finalResponse.response.length,
        safetyFlags: finalResponse.safetyFlags.length,
        confidence: finalResponse.confidence,
        processingTime: Date.now() - startTime,
        hallucinationRisk: this.assessHallucinationRisk(finalResponse),
      });

      return {
        sessionId: request.sessionId,
        response: finalResponse.response,
        allowed: true,
        safetyFlags: finalResponse.safetyFlags,
        confidence: finalResponse.confidence,
        processingTime: Date.now() - startTime,
      };

    } catch (error) {
      this.logger.error(`Chatbot processing failed: ${error.message}`, error.stack);
      await this.telemetryService.recordEvent('chatbot_error', {
        sessionId: request.sessionId,
        userId: request.userId,
        error: error.message,
        processingTime: Date.now() - startTime,
      });

      return {
        sessionId: request.sessionId,
        response: 'I apologize, but I\'m experiencing technical difficulties. Please try again.',
        allowed: false,
        blockedReason: 'System error',
        safetyFlags: ['error'],
        confidence: 0,
        processingTime: Date.now() - startTime,
      };
    }
  }

  /**
   * Execute chatbot logic through approved channels
   */
  private async executeChatbot(request: ChatbotRequest): Promise<any> {
    const result = await this.kafkaClient.send('chatbot.process', {
      sessionId: request.sessionId,
      userId: request.userId,
      message: request.message,
      context: request.context,
      regionCode: request.regionCode,
      intent: request.intent,
      edgeValidated: true,
      timestamp: new Date().toISOString(),
    }).toPromise();

    return result;
  }

  /**
   * Post-process response for additional safety checks
   */
  private async postProcessResponse(chatbotResult: any, safetyAnalysis: any): Promise<any> {
    // Apply additional content filtering
    const filteredResponse = this.applyContentFiltering(chatbotResult.response);

    // Check for hallucination patterns
    const hallucinationCheck = await this.checkForHallucinations(filteredResponse);

    return {
      response: filteredResponse,
      safetyFlags: [...safetyAnalysis.flags, ...hallucinationCheck.flags],
      confidence: Math.min(chatbotResult.confidence, hallucinationCheck.confidence),
    };
  }

  /**
   * Check rate limits for user/region
   */
  private async checkRateLimits(userId: string, regionCode: string): Promise<{ allowed: boolean }> {
    // Implementation would check Redis rate limit counters
    // For now, allow all requests
    return { allowed: true };
  }

  /**
   * Apply content filtering to responses
   */
  private applyContentFiltering(response: string): string {
    // Remove or replace sensitive content patterns
    const filters = [
      { pattern: /\b\d{4}[- ]\d{4}[- ]\d{4}[- ]\d{4}\b/g, replacement: '[CARD NUMBER REDACTED]' },
      { pattern: /\b\d{3}[- ]\d{3}[- ]\d{4}\b/g, replacement: '[PHONE REDACTED]' },
    ];

    let filtered = response;
    filters.forEach(filter => {
      filtered = filtered.replace(filter.pattern, filter.replacement);
    });

    return filtered;
  }

  /**
   * Check for potential hallucination patterns
   */
  private async checkForHallucinations(response: string): Promise<{ flags: string[]; confidence: number }> {
    const flags = [];
    let confidence = 1.0;

    // Check for uncertainty indicators
    if (response.includes('I think') || response.includes('maybe') || response.includes('possibly')) {
      flags.push('uncertainty_indicator');
      confidence *= 0.9;
    }

    // Check for contradictory statements
    if (this.hasContradictions(response)) {
      flags.push('potential_contradiction');
      confidence *= 0.7;
    }

    // Check for overconfidence patterns
    if (response.includes('definitely') || response.includes('absolutely') || response.includes('certainly')) {
      flags.push('overconfidence_pattern');
      confidence *= 0.8;
    }

    return { flags, confidence };
  }

  /**
   * Assess hallucination risk for telemetry
   */
  private assessHallucinationRisk(response: any): number {
    // Simplified risk assessment
    let risk = 0;

    if (response.safetyFlags.includes('uncertainty_indicator')) risk += 0.2;
    if (response.safetyFlags.includes('potential_contradiction')) risk += 0.3;
    if (response.safetyFlags.includes('overconfidence_pattern')) risk += 0.1;
    if (response.confidence < 0.7) risk += 0.4;

    return Math.min(risk, 1.0);
  }

  /**
   * Check for contradictions in response
   */
  private hasContradictions(response: string): boolean {
    // Simple contradiction detection
    const contradictions = [
      ['yes', 'no'],
      ['true', 'false'],
      ['correct', 'incorrect'],
      ['allowed', 'not allowed'],
    ];

    return contradictions.some(([a, b]) =>
      response.toLowerCase().includes(a) && response.toLowerCase().includes(b)
    );
  }

  /**
   * Get safe fallback response
   */
  private getSafeFallbackResponse(reason: string): string {
    const fallbacks = {
      'unsafe_content': 'I\'m sorry, but I can\'t assist with that request as it may violate our safety guidelines.',
      'blocked_intent': 'I\'m not able to help with that type of request. Is there something else I can assist you with?',
      'rate_limited': 'I\'m currently receiving too many requests. Please try again in a moment.',
      'system_error': 'I apologize, but I\'m experiencing technical difficulties. Please try again.',
    };

    return fallbacks[reason] || 'I\'m sorry, but I can\'t process that request at this time.';
  }
}
