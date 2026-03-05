/**
 * Pulsco AI Widget - Main Chat Component
 * A floating AI assistant widget for the PULSCO platform
 */

import React, { useState, useRef, useEffect } from 'react';
import { usePulscoAI } from '../hooks/usePulscoAI';
import { PulscoAIConfig, ChatMessage } from '../types';

interface PulscoAIWidgetProps {
  config?: PulscoAIConfig;
}

// Pulsco AI Icon SVG
const PulscoAIIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg 
    viewBox="0 0 24 24" 
    fill="none" 
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <circle cx="12" cy="12" r="10" fill="currentColor" opacity="0.2"/>
    <path 
      d="M12 6C8.686 6 6 8.686 6 12C6 15.314 8.686 18 12 18C15.314 18 18 15.314 18 12" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round"
    />
    <circle cx="12" cy="12" r="3" fill="currentColor"/>
    <path 
      d="M9 9L7 7M15 9L17 7M9 15L7 17M15 15L17 17" 
      stroke="currentColor" 
      strokeWidth="1.5" 
      strokeLinecap="round"
    />
  </svg>
);

// Chat Message Component
const ChatMessageItem: React.FC<{ message: ChatMessage; isLoading?: boolean }> = ({ message, isLoading }) => {
  const isUser = message.role === 'user';
  
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-3`}>
      <div 
        className={`max-w-[80%] rounded-2xl px-4 py-2 ${
          isUser 
            ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white' 
            : 'bg-gray-800 text-gray-100 border border-gray-700'
        }`}
      >
        <div className="text-sm whitespace-pre-wrap">{message.content || (isLoading ? '...' : '')}</div>
        <div className={`text-xs mt-1 ${isUser ? 'text-white/70' : 'text-gray-500'}`}>
          {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
    </div>
  );
};

// Typing Indicator Component
const TypingIndicator: React.FC = () => (
  <div className="flex justify-start mb-3">
    <div className="bg-gray-800 rounded-2xl px-4 py-3 border border-gray-700">
      <div className="flex space-x-1">
        <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
        <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
        <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
      </div>
    </div>
  </div>
);

// Main Pulsco AI Widget Component
export const PulscoAIWidget: React.FC<PulscoAIWidgetProps> = ({ config }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  const { 
    messages, 
    isLoading, 
    error, 
    sendMessage, 
    clearSession 
  } = usePulscoAI(config);

  const position = config?.position || 'bottom-right';
  const title = config?.title || 'Pulsco AI';
  const primaryColor = config?.primaryColor || '#8b5cf6'; // Purple-500 default

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Focus input when widget opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputValue.trim() || isLoading) return;
    
    const messageToSend = inputValue.trim();
    setInputValue('');
    
    await sendMessage(messageToSend);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed z-50 flex items-center gap-2 px-4 py-3 rounded-full shadow-lg transition-all duration-300 hover:scale-105 ${
          position === 'bottom-right' ? 'right-6' : 'left-6'
        } bottom-6`}
        style={{ 
          backgroundColor: primaryColor,
          boxShadow: `0 4px 20px ${primaryColor}40`
        }}
      >
        <PulscoAIIcon className="w-6 h-6 text-white" />
        <span className="text-white font-semibold hidden md:inline">{title}</span>
        {isOpen ? (
          <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : null}
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div 
          className={`fixed z-50 w-96 h-[500px] rounded-2xl shadow-2xl flex flex-col overflow-hidden transition-all duration-300 ${
            position === 'bottom-right' ? 'right-6' : 'left-6'
          } bottom-24`}
          style={{ 
            backgroundColor: '#1a1a2e',
            border: '1px solid #2d2d4a'
          }}
        >
          {/* Header */}
          <div 
            className="px-4 py-3 flex items-center justify-between"
            style={{ backgroundColor: primaryColor }}
          >
            <div className="flex items-center gap-2">
              <PulscoAIIcon className="w-6 h-6 text-white" />
              <span className="text-white font-semibold">{title}</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={clearSession}
                className="p-1.5 rounded-lg hover:bg-white/20 transition-colors"
                title="New conversation"
              >
                <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg hover:bg-white/20 transition-colors"
              >
                <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4">
            {error && (
              <div className="bg-red-500/20 border border-red-500/50 rounded-lg px-3 py-2 mb-3 text-red-200 text-sm">
                {error}
              </div>
            )}
            
            {messages.map((message) => (
              <ChatMessageItem 
                key={message.id} 
                message={message} 
                isLoading={isLoading && message.id === messages[messages.length - 1]?.id && !message.content}
              />
            ))}
            
            {isLoading && messages[messages.length - 1]?.content && <TypingIndicator />}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <form onSubmit={handleSendMessage} className="p-3 border-t border-gray-700">
            <div className="flex items-center gap-2">
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder="Type your message..."
                disabled={isLoading}
                className="flex-1 bg-gray-800 border border-gray-600 rounded-full px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:border-purple-500 disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={!inputValue.trim() || isLoading}
                className="p-2 rounded-full transition-colors disabled:opacity-50"
                style={{ backgroundColor: primaryColor }}
              >
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
            </div>
          </form>

          {/* Branding Footer */}
          {config?.showBranding !== false && (
            <div className="px-4 py-2 text-center text-xs text-gray-500 border-t border-gray-700">
              Powered by Pulsco AI • {new Date().getFullYear()}
            </div>
          )}
        </div>
      )}
    </>
  );
};

export default PulscoAIWidget;
