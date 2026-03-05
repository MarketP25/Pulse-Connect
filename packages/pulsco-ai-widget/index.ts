/**
 * Pulsco AI Widget - Main Export
 * Global AI Assistant Widget for PULSCO Platform
 */

export { PulscoAIWidget, default } from "./components/PulscoAIWidget";
export { usePulscoAI } from "./hooks/usePulscoAI";
export type {
  ChatMessage,
  ChatSession,
  PulscoAIConfig,
  ChatRequest,
  ChatResponse,
  AnalyzeResponse
} from "./types";
