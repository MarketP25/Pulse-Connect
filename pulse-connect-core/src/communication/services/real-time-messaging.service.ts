import { Injectable, Logger } from "@nestjs/common";
import { emitCommunicationEvent } from "../../csi/instrumentation";

export interface Message {
  messageId: string;
  conversationId: string;
  senderId: string;
  recipientId: string;
  content: {
    type: "text" | "image" | "video" | "file" | "location" | "contact";
    text?: string;
    mediaUrl?: string;
    metadata?: any;
  };
  timestamp: Date;
  status: "sent" | "delivered" | "read" | "failed";
  encryption: {
    algorithm: string;
    keyId: string;
    signature: string;
  };
  region: string;
}

export interface Conversation {
  conversationId: string;
  participants: string[];
  type: "direct" | "group" | "channel";
  name?: string;
  description?: string;
  avatar?: string;
  settings: {
    isEncrypted: boolean;
    allowInvites: boolean;
    messageRetention: number; // days
    maxParticipants?: number;
  };
  createdAt: Date;
  updatedAt: Date;
  lastMessage?: Message;
}

export interface RealTimeEvent {
  eventId: string;
  type: "message" | "typing" | "presence" | "reaction" | "call";
  conversationId: string;
  userId: string;
  data: any;
  timestamp: Date;
}

@Injectable()
export class RealTimeMessagingService {
  private readonly logger = new Logger(RealTimeMessagingService.name);

  // PULSCO Planetary Messaging Infrastructure
  private planetaryConfig = {
    regions: ["africa-south1", "us-central1", "europe-west1", "asia-east1"],
    encryption: {
      algorithm: "quantum_resistant_aes_256",
      keyRotation: 24 * 60 * 60 * 1000, // 24 hours
      forwardSecrecy: true
    },
    scaling: {
      maxConnectionsPerNode: 10000,
      messageThroughput: 100000, // messages per second
      storageRetention: 365 // days
    }
  };

  // In-memory storage for demo (would be Redis/Kafka in production)
  private conversations = new Map<string, Conversation>();
  private messages = new Map<string, Message[]>();
  private onlineUsers = new Map<string, { status: string; lastSeen: Date; region: string }>();

  /**
   * Send message with planetary routing and encryption
   */
  async sendMessage(
    message: Omit<Message, "messageId" | "timestamp" | "status" | "encryption">
  ): Promise<Message> {
    try {
      this.logger.log(
        `Sending planetary message from ${message.senderId} to ${message.recipientId}`
      );

      // Generate message ID and timestamp
      const messageId = this.generateMessageId();
      const timestamp = new Date();

      // Encrypt message content
      const encryption = await this.encryptMessage(message.content);

      // Create full message object
      const fullMessage: Message = {
        ...message,
        messageId,
        timestamp,
        status: "sent",
        encryption
      };

      // Store message
      await this.storeMessage(fullMessage);

      // Update conversation
      await this.updateConversationLastMessage(message.conversationId, fullMessage);

      // Route to recipient(s)
      await this.routeMessage(fullMessage);

      // Emit real-time event
      await this.emitRealTimeEvent({
        eventId: this.generateEventId(),
        type: "message",
        conversationId: message.conversationId,
        userId: message.senderId,
        data: { message: fullMessage },
        timestamp
      });

      emitCommunicationEvent(
        "message.sent",
        message.region || "GLOBAL",
        {
          messageId: fullMessage.messageId,
          conversationId: message.conversationId,
          senderId: message.senderId,
          recipientId: message.recipientId,
          contentType: message.content.type
        },
        {
          riskScore: 14,
          performanceScore: 89
        }
      );

      return fullMessage;
    } catch (error) {
      this.logger.error("Message sending failed:", error);
      throw new Error(
        `Message sending error: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  /**
   * Create new conversation with planetary participants
   */
  async createConversation(
    creatorId: string,
    participants: string[],
    type: Conversation["type"],
    settings?: Partial<Conversation["settings"]>
  ): Promise<Conversation> {
    try {
      const conversationId = this.generateConversationId();

      const conversation: Conversation = {
        conversationId,
        participants: [creatorId, ...participants],
        type,
        settings: {
          isEncrypted: true,
          allowInvites: type !== "direct",
          messageRetention: 365,
          maxParticipants: type === "group" ? 100 : type === "channel" ? 1000 : 2,
          ...settings
        },
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Store conversation
      this.conversations.set(conversationId, conversation);

      // Initialize message history
      this.messages.set(conversationId, []);

      // Notify participants
      await this.notifyConversationCreation(conversation);

      emitCommunicationEvent(
        "conversation.created",
        "GLOBAL",
        {
          conversationId,
          creatorId,
          participantCount: conversation.participants.length,
          type
        },
        {
          riskScore: 16,
          performanceScore: 86
        }
      );

      return conversation;
    } catch (error) {
      this.logger.error("Conversation creation failed:", error);
      throw new Error(
        `Conversation creation error: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  /**
   * Get conversation messages with planetary pagination
   */
  async getConversationMessages(
    conversationId: string,
    userId: string,
    options?: {
      limit?: number;
      before?: Date;
      after?: Date;
    }
  ): Promise<{
    messages: Message[];
    hasMore: boolean;
    totalCount: number;
  }> {
    try {
      // Verify user has access to conversation
      const conversation = this.conversations.get(conversationId);
      if (!conversation || !conversation.participants.includes(userId)) {
        throw new Error("Access denied");
      }

      const allMessages = this.messages.get(conversationId) || [];
      const limit = options?.limit || 50;

      // Apply time filters
      let filteredMessages = allMessages;
      if (options?.before) {
        filteredMessages = filteredMessages.filter((m) => m.timestamp < options.before!);
      }
      if (options?.after) {
        filteredMessages = filteredMessages.filter((m) => m.timestamp > options.after!);
      }

      // Sort by timestamp descending and limit
      const messages = filteredMessages
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
        .slice(0, limit);

      return {
        messages,
        hasMore: filteredMessages.length > limit,
        totalCount: filteredMessages.length
      };
    } catch (error) {
      this.logger.error("Message retrieval failed:", error);
      throw new Error(
        `Message retrieval error: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  /**
   * Update user presence across planetary regions
   */
  async updatePresence(userId: string, status: string, region: string): Promise<void> {
    try {
      this.onlineUsers.set(userId, {
        status,
        lastSeen: new Date(),
        region
      });

      // Emit presence event
      await this.emitRealTimeEvent({
        eventId: this.generateEventId(),
        type: "presence",
        conversationId: "", // Global event
        userId,
        data: { status, region },
        timestamp: new Date()
      });

      emitCommunicationEvent(
        "presence.updated",
        region,
        {
          userId,
          status,
          region
        },
        {
          riskScore: 10,
          performanceScore: 92
        }
      );
    } catch (error) {
      this.logger.error("Presence update failed:", error);
      throw new Error(
        `Presence update error: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  /**
   * Send typing indicator with planetary coordination
   */
  async sendTypingIndicator(
    conversationId: string,
    userId: string,
    isTyping: boolean
  ): Promise<void> {
    try {
      await this.emitRealTimeEvent({
        eventId: this.generateEventId(),
        type: "typing",
        conversationId,
        userId,
        data: { isTyping },
        timestamp: new Date()
      });
    } catch (error) {
      this.logger.error("Typing indicator failed:", error);
      throw new Error(
        `Typing indicator error: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  /**
   * Add reaction to message with planetary sync
   */
  async addReaction(messageId: string, userId: string, reaction: string): Promise<void> {
    try {
      // Find message across all conversations
      let targetMessage: Message | undefined;
      let conversationId: string | undefined;

      for (const [convId, messages] of this.messages) {
        const message = messages.find((m) => m.messageId === messageId);
        if (message) {
          targetMessage = message;
          conversationId = convId;
          break;
        }
      }

      if (!targetMessage || !conversationId) {
        throw new Error("Message not found");
      }

      // Add reaction to message metadata
      if (!targetMessage.content.metadata) {
        targetMessage.content.metadata = {};
      }
      if (!targetMessage.content.metadata.reactions) {
        targetMessage.content.metadata.reactions = {};
      }
      if (!targetMessage.content.metadata.reactions[reaction]) {
        targetMessage.content.metadata.reactions[reaction] = [];
      }
      targetMessage.content.metadata.reactions[reaction].push(userId);

      // Emit reaction event
      await this.emitRealTimeEvent({
        eventId: this.generateEventId(),
        type: "reaction",
        conversationId,
        userId,
        data: { messageId, reaction },
        timestamp: new Date()
      });
    } catch (error) {
      this.logger.error("Reaction addition failed:", error);
      throw new Error(
        `Reaction addition error: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  /**
   * Get planetary messaging analytics
   */
  async getMessagingAnalytics(timeRange: { start: Date; end: Date }): Promise<{
    totalMessages: number;
    activeConversations: number;
    activeUsers: number;
    messagesPerSecond: number;
    regionalBreakdown: Record<
      string,
      {
        messages: number;
        users: number;
        conversations: number;
      }
    >;
    messageTypes: Record<string, number>;
    engagement: {
      avgMessagesPerConversation: number;
      avgResponseTime: number;
      conversationDuration: number;
    };
  }> {
    try {
      // Aggregate messaging data across planetary regions
      const analytics = await this.aggregateMessagingData(timeRange);

      return analytics;
    } catch (error) {
      this.logger.error("Messaging analytics failed:", error);
      throw new Error(
        `Analytics error: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  /**
   * Search messages across planetary conversations
   */
  async searchMessages(
    userId: string,
    query: string,
    options?: {
      conversationId?: string;
      dateRange?: { start: Date; end: Date };
      limit?: number;
    }
  ): Promise<{
    results: Array<{
      message: Message;
      conversationId: string;
      highlights: string[];
    }>;
    totalCount: number;
    hasMore: boolean;
  }> {
    try {
      const results: Array<{
        message: Message;
        conversationId: string;
        highlights: string[];
      }> = [];

      // Search across user's conversations
      for (const [conversationId, conversation] of this.conversations) {
        if (!conversation.participants.includes(userId)) continue;
        if (options?.conversationId && options.conversationId !== conversationId) continue;

        const messages = this.messages.get(conversationId) || [];

        for (const message of messages) {
          if (options?.dateRange) {
            if (
              message.timestamp < options.dateRange.start ||
              message.timestamp > options.dateRange.end
            ) {
              continue;
            }
          }

          // Simple text search (would use full-text search in production)
          if (
            message.content.text &&
            message.content.text.toLowerCase().includes(query.toLowerCase())
          ) {
            results.push({
              message,
              conversationId,
              highlights: [message.content.text] // Would highlight matching parts
            });
          }
        }
      }

      const limit = options?.limit || 50;
      const limitedResults = results.slice(0, limit);

      return {
        results: limitedResults,
        totalCount: results.length,
        hasMore: results.length > limit
      };
    } catch (error) {
      this.logger.error("Message search failed:", error);
      throw new Error(`Search error: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  // Private helper methods

  private generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateConversationId(): string {
    return `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateEventId(): string {
    return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async encryptMessage(content: any): Promise<Message["encryption"]> {
    // Mock encryption - would use actual quantum-resistant encryption
    return {
      algorithm: this.planetaryConfig.encryption.algorithm,
      keyId: `key_${Date.now()}`,
      signature: `sig_${Math.random().toString(36).substr(2, 9)}`
    };
  }

  private async storeMessage(message: Message): Promise<void> {
    const conversationMessages = this.messages.get(message.conversationId) || [];
    conversationMessages.push(message);
    this.messages.set(message.conversationId, conversationMessages);
  }

  private async updateConversationLastMessage(
    conversationId: string,
    message: Message
  ): Promise<void> {
    const conversation = this.conversations.get(conversationId);
    if (conversation) {
      conversation.lastMessage = message;
      conversation.updatedAt = new Date();
    }
  }

  private async routeMessage(message: Message): Promise<void> {
    // Route to recipient's region
    const recipientPresence = this.onlineUsers.get(message.recipientId);
    if (recipientPresence) {
      // In production, this would route through planetary messaging infrastructure
      this.logger.log(`Routed message ${message.messageId} to region ${recipientPresence.region}`);
    }
  }

  private async emitRealTimeEvent(event: RealTimeEvent): Promise<void> {
    // Emit to WebSocket connections, Kafka, etc.
    this.logger.log(`Emitted real-time event: ${event.type} for user ${event.userId}`);
  }

  private async notifyConversationCreation(conversation: Conversation): Promise<void> {
    // Notify all participants
    for (const participantId of conversation.participants) {
      await this.emitRealTimeEvent({
        eventId: this.generateEventId(),
        type: "message",
        conversationId: conversation.conversationId,
        userId: participantId,
        data: { conversation },
        timestamp: new Date()
      });
    }
  }

  private async aggregateMessagingData(timeRange: { start: Date; end: Date }): Promise<any> {
    // Mock analytics aggregation
    let totalMessages = 0;
    const regionalBreakdown: Record<string, any> = {};
    const messageTypes: Record<string, number> = {};

    for (const [conversationId, messages] of this.messages) {
      const conversation = this.conversations.get(conversationId);
      if (!conversation) continue;

      const conversationMessages = messages.filter(
        (m) => m.timestamp >= timeRange.start && m.timestamp <= timeRange.end
      );

      totalMessages += conversationMessages.length;

      // Aggregate by region (mock)
      const region = "us-central1"; // Would be determined by conversation metadata
      if (!regionalBreakdown[region]) {
        regionalBreakdown[region] = { messages: 0, users: 0, conversations: 0 };
      }
      regionalBreakdown[region].messages += conversationMessages.length;
      regionalBreakdown[region].conversations += 1;

      // Count message types
      for (const message of conversationMessages) {
        messageTypes[message.content.type] = (messageTypes[message.content.type] || 0) + 1;
      }
    }

    return {
      totalMessages,
      activeConversations: this.conversations.size,
      activeUsers: this.onlineUsers.size,
      messagesPerSecond:
        totalMessages / ((timeRange.end.getTime() - timeRange.start.getTime()) / 1000),
      regionalBreakdown,
      messageTypes,
      engagement: {
        avgMessagesPerConversation: totalMessages / Math.max(this.conversations.size, 1),
        avgResponseTime: 300, // seconds (mock)
        conversationDuration: 86400 // seconds (mock)
      }
    };
  }
}
