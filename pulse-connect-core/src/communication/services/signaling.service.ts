import { Pool } from "pg";
import { v4 as uuidv4 } from "uuid";
import WebSocket from "ws";
import { EventEmitter } from "events";

export interface SignalingMessage {
  type:
    | "offer"
    | "answer"
    | "ice-candidate"
    | "call-request"
    | "call-response"
    | "hangup"
    | "presence-update";
  from: string;
  to?: string;
  channelId?: string;
  callId?: string;
  data?: any;
  timestamp: number;
  traceId: string;
}

export interface SignalingSession {
  sessionId: string;
  userId: string;
  connectedAt: Date;
  lastActivity: Date;
  subscriptions: Set<string>; // Channels/rooms subscribed to
  metadata: any;
}

export class SignalingService extends EventEmitter {
  private sessions: Map<string, SignalingSession> = new Map();
  private wss: WebSocket.Server | null = null;
  private heartbeatInterval: NodeJS.Timeout | null = null;

  constructor(
    private pool: Pool,
    private port: number = 8080,
    private heartbeatIntervalMs: number = 30000
  ) {
    super();
    this.setupWebSocketServer();
    this.setupHeartbeat();
  }

  /**
   * Initialize WebSocket server for signaling
   */
  private setupWebSocketServer(): void {
    this.wss = new WebSocket.Server({ port: this.port });

    this.wss.on("connection", (ws: WebSocket, request) => {
      const sessionId = uuidv4();
      const userId = this.extractUserIdFromRequest(request);

      if (!userId) {
        ws.close(4001, "Unauthorized");
        return;
      }

      // Create session
      const session: SignalingSession = {
        sessionId,
        userId,
        connectedAt: new Date(),
        lastActivity: new Date(),
        subscriptions: new Set(),
        metadata: {}
      };

      this.sessions.set(sessionId, session);

      // Handle incoming messages
      ws.on("message", (data: Buffer) => {
        try {
          const message: SignalingMessage = JSON.parse(data.toString());
          this.handleSignalingMessage(session, message, ws);
        } catch (error) {
          console.error("Invalid signaling message:", error);
          ws.send(JSON.stringify({ type: "error", message: "Invalid message format" }));
        }
      });

      ws.on("close", () => {
        this.handleSessionDisconnect(sessionId);
      });

      ws.on("pong", () => {
        session.lastActivity = new Date();
      });

      // Send welcome message
      ws.send(
        JSON.stringify({
          type: "welcome",
          sessionId,
          userId,
          timestamp: Date.now()
        })
      );

      // Update presence
      this.updatePresence(userId, "online", sessionId);
    });

    console.log(`Signaling server started on port ${this.port}`);
  }

  /**
   * Handle incoming signaling messages
   */
  private async handleSignalingMessage(
    session: SignalingSession,
    message: SignalingMessage,
    ws: WebSocket
  ): Promise<void> {
    session.lastActivity = new Date();

    // Validate message
    if (!this.validateSignalingMessage(message)) {
      ws.send(JSON.stringify({ type: "error", message: "Invalid message" }));
      return;
    }

    // Log for audit
    await this.logSignalingEvent(session.userId, message);

    switch (message.type) {
      case "call-request":
        await this.handleCallRequest(session, message, ws);
        break;

      case "call-response":
        await this.handleCallResponse(session, message);
        break;

      case "offer":
      case "answer":
      case "ice-candidate":
        await this.handleWebRTCSignaling(session, message);
        break;

      case "hangup":
        await this.handleHangup(session, message);
        break;

      case "presence-update":
        await this.handlePresenceUpdate(session, message);
        break;

      default:
        console.log(`Unknown message type: ${message.type}`);
    }
  }

  /**
   * Handle call initiation requests
   */
  private async handleCallRequest(
    session: SignalingSession,
    message: SignalingMessage,
    ws: WebSocket
  ): Promise<void> {
    const { to, callId, data } = message;

    if (!to || !callId) {
      ws.send(JSON.stringify({ type: "error", message: "Missing recipient or call ID" }));
      return;
    }

    // Check if recipient is online and available
    const recipientSession = this.findSessionByUserId(to);
    if (!recipientSession) {
      ws.send(
        JSON.stringify({
          type: "call-response",
          callId,
          accepted: false,
          reason: "user_offline"
        })
      );
      return;
    }

    // Forward call request to recipient
    const recipientWs = this.findWebSocketBySessionId(recipientSession.sessionId);
    if (recipientWs) {
      recipientWs.send(
        JSON.stringify({
          type: "call-request",
          from: session.userId,
          callId,
          data,
          timestamp: Date.now()
        })
      );
    }
  }

  /**
   * Handle call response (accept/reject)
   */
  private async handleCallResponse(
    session: SignalingSession,
    message: SignalingMessage
  ): Promise<void> {
    const { to, callId, data } = message;

    if (!to || !callId) return;

    // Find initiator's session
    const initiatorSession = this.findSessionByUserId(to);
    if (!initiatorSession) return;

    const initiatorWs = this.findWebSocketBySessionId(initiatorSession.sessionId);
    if (initiatorWs) {
      initiatorWs.send(
        JSON.stringify({
          type: "call-response",
          from: session.userId,
          callId,
          data,
          timestamp: Date.now()
        })
      );
    }
  }

  /**
   * Handle WebRTC signaling (offer, answer, ICE candidates)
   */
  private async handleWebRTCSignaling(
    session: SignalingSession,
    message: SignalingMessage
  ): Promise<void> {
    const { to, callId, data } = message;

    if (!to || !callId) return;

    const recipientSession = this.findSessionByUserId(to);
    if (!recipientSession) return;

    const recipientWs = this.findWebSocketBySessionId(recipientSession.sessionId);
    if (recipientWs) {
      recipientWs.send(
        JSON.stringify({
          type: message.type,
          from: session.userId,
          callId,
          data,
          timestamp: Date.now()
        })
      );
    }
  }

  /**
   * Handle call hangup
   */
  private async handleHangup(session: SignalingSession, message: SignalingMessage): Promise<void> {
    const { to, callId } = message;

    if (!to || !callId) return;

    const recipientSession = this.findSessionByUserId(to);
    if (!recipientSession) return;

    const recipientWs = this.findWebSocketBySessionId(recipientSession.sessionId);
    if (recipientWs) {
      recipientWs.send(
        JSON.stringify({
          type: "hangup",
          from: session.userId,
          callId,
          timestamp: Date.now()
        })
      );
    }
  }

  /**
   * Handle presence updates
   */
  private async handlePresenceUpdate(
    session: SignalingSession,
    message: SignalingMessage
  ): Promise<void> {
    const { data } = message;

    if (data && data.status) {
      await this.updatePresence(session.userId, data.status, session.sessionId, data.customStatus);
    }
  }

  /**
   * Send message to specific user
   */
  async sendToUser(userId: string, message: any): Promise<boolean> {
    const session = this.findSessionByUserId(userId);
    if (!session) return false;

    const ws = this.findWebSocketBySessionId(session.sessionId);
    if (!ws) return false;

    ws.send(JSON.stringify(message));
    return true;
  }

  /**
   * Broadcast message to channel/room
   */
  async broadcastToChannel(
    channelId: string,
    message: any,
    excludeUserId?: string
  ): Promise<number> {
    let sentCount = 0;

    for (const [sessionId, session] of this.sessions) {
      if (session.subscriptions.has(channelId) && session.userId !== excludeUserId) {
        const ws = this.findWebSocketBySessionId(sessionId);
        if (ws) {
          ws.send(JSON.stringify(message));
          sentCount++;
        }
      }
    }

    return sentCount;
  }

  /**
   * Subscribe user to channel
   */
  subscribeToChannel(sessionId: string, channelId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) return false;

    session.subscriptions.add(channelId);
    return true;
  }

  /**
   * Unsubscribe user from channel
   */
  unsubscribeFromChannel(sessionId: string, channelId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) return false;

    session.subscriptions.delete(channelId);
    return true;
  }

  /**
   * Get active sessions count
   */
  getActiveSessionsCount(): number {
    return this.sessions.size;
  }

  /**
   * Get sessions for user
   */
  getUserSessions(userId: string): SignalingSession[] {
    return Array.from(this.sessions.values()).filter((session) => session.userId === userId);
  }

  /**
   * Update user presence
   */
  private async updatePresence(
    userId: string,
    status: string,
    sessionId: string,
    customStatus?: string
  ): Promise<void> {
    await this.pool.query(
      `
      INSERT INTO presence_state (user_id, status, custom_status, last_seen, updated_at)
      VALUES ($1, $2, $3, NOW(), NOW())
      ON CONFLICT (user_id) DO UPDATE SET
        status = EXCLUDED.status,
        custom_status = EXCLUDED.custom_status,
        last_seen = NOW(),
        updated_at = NOW()
    `,
      [userId, status, customStatus]
    );

    // Broadcast presence update to user's contacts/channels
    this.emit("presence-update", { userId, status, customStatus });
  }

  /**
   * Setup heartbeat mechanism
   */
  private setupHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      const now = Date.now();

      for (const [sessionId, session] of this.sessions) {
        const ws = this.findWebSocketBySessionId(sessionId);

        if (ws) {
          // Check if session is still alive
          if (now - session.lastActivity.getTime() > this.heartbeatIntervalMs * 2) {
            ws.close(4002, "Heartbeat timeout");
            this.handleSessionDisconnect(sessionId);
          } else {
            // Send ping
            ws.ping();
          }
        }
      }
    }, this.heartbeatIntervalMs);
  }

  /**
   * Handle session disconnect
   */
  private handleSessionDisconnect(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      // Update presence to offline if no other sessions
      const userSessions = this.getUserSessions(session.userId);
      if (userSessions.length <= 1) {
        this.updatePresence(session.userId, "offline", sessionId);
      }

      this.sessions.delete(sessionId);
      this.emit("session-disconnect", session);
    }
  }

  /**
   * Extract user ID from request (implement based on auth system)
   */
  private extractUserIdFromRequest(request: any): string | null {
    // This would integrate with your authentication system
    // For now, return a mock user ID
    return request.headers["x-user-id"] || null;
  }

  /**
   * Validate signaling message
   */
  private validateSignalingMessage(message: SignalingMessage): boolean {
    if (!message.type || !message.from || !message.timestamp) {
      return false;
    }

    // Check timestamp is recent (within 5 minutes)
    const now = Date.now();
    const messageTime = message.timestamp;
    if (Math.abs(now - messageTime) > 5 * 60 * 1000) {
      return false;
    }

    return true;
  }

  /**
   * Find session by user ID
   */
  private findSessionByUserId(userId: string): SignalingSession | null {
    for (const session of this.sessions.values()) {
      if (session.userId === userId) {
        return session;
      }
    }
    return null;
  }

  /**
   * Find WebSocket by session ID
   */
  private findWebSocketBySessionId(sessionId: string): WebSocket | null {
    // This would require maintaining a map of sessionId -> WebSocket
    // Implementation depends on your WebSocket management
    return null; // Placeholder
  }

  /**
   * Log signaling events for audit
   */
  private async logSignalingEvent(userId: string, message: SignalingMessage): Promise<void> {
    await this.pool.query(
      `
      INSERT INTO communication_audit_log (
        event_type, user_id, entity_type, entity_id, action, metadata,
        trace_id, policy_version, region_code
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `,
      [
        `signaling_${message.type}`,
        userId,
        "signaling",
        uuidv4(),
        "send",
        {
          message_type: message.type,
          to: message.to,
          channel_id: message.channelId,
          call_id: message.callId
        },
        message.traceId || uuidv4(),
        "v1.0.0",
        "US"
      ]
    );
  }

  /**
   * Graceful shutdown
   */
  async shutdown(): Promise<void> {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    if (this.wss) {
      this.wss.close();
    }

    // Update all users to offline
    for (const session of this.sessions.values()) {
      await this.updatePresence(session.userId, "offline", session.sessionId);
    }

    this.sessions.clear();
  }
}
