/**
 * Pulsco AI Widget - TypeScript Types
 */

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: number;
}

export interface ChatSession {
  sessionId: string;
  messages: ChatMessage[];
  createdAt: number;
}

export interface PulscoAIConfig {
  /** API endpoint for the chatbot (defaults to edge gateway) */
  apiEndpoint?: string;
  /** Custom title for the widget */
  title?: string;
  /** Custom welcome message */
  welcomeMessage?: string;
  /** Position of the widget (bottom-right or bottom-left) */
  position?: "bottom-right" | "bottom-left";
  /** Whether to show the branding */
  showBranding?: boolean;
  /** Custom styles override */
  primaryColor?: string;
}

export interface ChatRequest {
  message: string;
  userId?: string;
  sessionId?: string;
  conversationHistory?: Array<{ role: string; content: string }>;
}

export interface ChatResponse {
  message: string;
  sessionId: string;
  timestamp: string;
}

export interface AnalyzeResponse {
  intent: string;
  confidence: number;
  entities?: Record<string, string>;
}
