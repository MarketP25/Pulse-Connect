"use client";

import React from "react";
import { PulscoAIWidget, PulscoAIConfig } from "@pulsco/pulsco-ai-widget";

export function AdminAIAssistant() {
  const config: PulscoAIConfig = {
    apiEndpoint: process.env.NEXT_PUBLIC_EDGE_GATEWAY_URL || "/api/edge",
    title: "People & Risk AI Assistant",
    welcomeMessage:
      "Hello! I'm your People & Risk AI Assistant. I can help you with:\n\n• HR Management\n• Risk Assessment\n• Employee Analytics\n• Compliance Tracking\n• Workforce Planning\n\nHow can I assist you today?",
    position: "bottom-right",
    showBranding: true,
    primaryColor: "#2563eb"
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <PulscoAIWidget config={config} />
    </div>
  );
}

export default AdminAIAssistant;
