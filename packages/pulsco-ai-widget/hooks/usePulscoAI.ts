/**
 * Pulsco AI Widget - React Hook for Chatbot API
 */

import { useCallback, useRef, useState } from "react";
import { ChatMessage, ChatRequest, ChatResponse, PulscoAIConfig } from "../types";

const DEFAULT_ERROR_MESSAGE = "Failed to get response from Pulsco AI";

const generateId = (): string => {
  return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

const generateSessionId = (): string => {
  return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

export interface UsePulscoAIReturn {
  messages: ChatMessage[];
  isLoading: boolean;
  error: string | null;
  sendMessage: (content: string) => Promise<void>;
  clearSession: () => void;
  sessionId: string;
}

export const usePulscoAI = (config?: PulscoAIConfig): UsePulscoAIReturn => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string>(generateSessionId());
  const abortControllerRef = useRef<AbortController | null>(null);

  const apiEndpoint = config?.apiEndpoint || "/api/edge";
  const welcomeMessage =
    config?.welcomeMessage || "Hello! I'm Pulsco AI. How can I help you today?";

  const initializeSession = useCallback(() => {
    const welcomeMsg: ChatMessage = {
      id: generateId(),
      role: "assistant",
      content: welcomeMessage,
      timestamp: Date.now()
    };
    setMessages([welcomeMsg]);
    setSessionId(generateSessionId());
    setError(null);
  }, [welcomeMessage]);

  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim()) return;

      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();

      const userMessage: ChatMessage = {
        id: generateId(),
        role: "user",
        content: content.trim(),
        timestamp: Date.now()
      };

      setMessages((prev) => [...prev, userMessage]);
      setIsLoading(true);
      setError(null);

      const aiMessageId = generateId();
      setMessages((prev) => [
        ...prev,
        {
          id: aiMessageId,
          role: "assistant",
          content: "",
          timestamp: Date.now()
        }
      ]);

      try {
        const conversationHistory = messages.map((message) => ({
          role: message.role,
          content: message.content
        }));

        const request: ChatRequest = {
          message: content.trim(),
          sessionId,
          conversationHistory
        };

        const response = await fetch(`${apiEndpoint}/chatbot/message`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(request),
          signal: abortControllerRef.current.signal
        });

        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }

        const data = (await response.json()) as ChatResponse;
        setMessages((prev) =>
          prev.map((message) =>
            message.id === aiMessageId ? { ...message, content: data.message } : message
          )
        );
      } catch (errorValue: unknown) {
        if (errorValue instanceof Error && errorValue.name === "AbortError") {
          return;
        }

        const message =
          errorValue instanceof Error && errorValue.message
            ? errorValue.message
            : DEFAULT_ERROR_MESSAGE;
        setError(message);
        setMessages((prev) =>
          prev.map((messageItem) =>
            messageItem.id === aiMessageId
              ? { ...messageItem, content: "Sorry, I encountered an error. Please try again." }
              : messageItem
          )
        );
      } finally {
        setIsLoading(false);
      }
    },
    [apiEndpoint, sessionId, messages]
  );

  const clearSession = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setMessages([]);
    setError(null);
    setSessionId(generateSessionId());
    initializeSession();
  }, [initializeSession]);

  return {
    messages,
    isLoading,
    error,
    sendMessage,
    clearSession,
    sessionId
  };
};
