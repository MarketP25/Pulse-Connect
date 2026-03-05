'use client';

import React from 'react';
import { PulscoAIWidget, PulscoAIConfig } from '@pulsco/pulsco-ai-widget';

export function AdminAIAssistant() {
  const config: PulscoAIConfig = {
    apiEndpoint: process.env.NEXT_PUBLIC_EDGE_GATEWAY_URL || '/api/edge',
    title: 'Tech & Security AI Assistant',
    welcomeMessage: 'Hello! I\'m your Tech & Security AI Assistant. I can help you with:\n\n• Security Alerts\n• System Performance\n• Infrastructure\n• Vulnerability Management\n• Access Control\n\nHow can I assist you today?',
    position: 'bottom-right',
    showBranding: true,
    primaryColor: '#2563eb',
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <PulscoAIWidget config={config} />
    </div>
  );
}

export default AdminAIAssistant;
