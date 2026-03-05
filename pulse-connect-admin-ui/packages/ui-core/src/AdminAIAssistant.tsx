'use client';

import React from 'react';
import { PulscoAIWidget, PulscoAIConfig } from '@pulsco/pulsco-ai-widget';

/**
 * Admin AI Assistant Component
 * Provides AI-powered assistance for admin dashboard users.
 */
export function AdminAIAssistant() {
  const config: PulscoAIConfig = {
    apiEndpoint: process.env.NEXT_PUBLIC_EDGE_GATEWAY_URL || '/api/edge',
    title: 'Pulsco AI Assistant',
    welcomeMessage:
      "Hello! I'm your Pulsco AI Assistant. I can help you with:\n\n- Ecommerce & Payments\n- Billing & Subscriptions\n- User Management\n- Governance Policies\n- System Configuration\n- Analytics & Reports\n\nHow can I assist you today?",
    position: 'bottom-right',
    showBranding: true,
    primaryColor: '#2563eb', // Blue-600
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <PulscoAIWidget config={config} />
    </div>
  );
}

export default AdminAIAssistant;

