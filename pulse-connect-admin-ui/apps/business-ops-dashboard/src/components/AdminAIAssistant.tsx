"use client";

import React from "react";
import { PulscoAIWidget, PulscoAIConfig } from "@pulsco/pulsco-ai-widget";

/**
 * Admin AI Assistant Component
 * Provides AI-powered assistance for Business Operations dashboard users
 */
export function AdminAIAssistant() {
  const config: PulscoAIConfig = {
    apiEndpoint: process.env.NEXT_PUBLIC_EDGE_GATEWAY_URL || "/api/edge",
    title: "Business Ops AI Assistant",
    welcomeMessage:
      "Hello! I'm your Business Operations AI Assistant. I can help you with:\n\n• Operations Management\n• KPI Monitoring\n• Performance Analytics\n• Process Optimization\n• Resource Allocation\n\nHow can I assist you today?",
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
