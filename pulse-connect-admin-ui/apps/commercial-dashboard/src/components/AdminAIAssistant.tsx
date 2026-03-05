'use client';

import React from 'react';
import { PulscoAIWidget, PulscoAIConfig } from '@pulsco/pulsco-ai-widget';

export function AdminAIAssistant() {
  const config: PulscoAIConfig = {
    apiEndpoint: process.env.NEXT_PUBLIC_EDGE_GATEWAY_URL || '/api/edge',
    title: 'Commercial AI Assistant',
    welcomeMessage: 'Hello! I\'m your Commercial AI Assistant. I can help you with:\n\n• Sales & Revenue\n• Customer Acquisition\n• Marketing Campaigns\n• Commercial Analytics\n• Deal Management\n\nHow can I assist you today?',
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
