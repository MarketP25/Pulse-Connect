import React, { useState } from "react";
import { Sparkles, Send, X, Terminal } from "lucide-react";
import { Card, Input } from "./packages/ui-components";
import { IXAZone } from "./IXALayout";

// Integration with existing client (assumed location based on docs)
// import { getAIResponse } from './pulse-connect-ui/src/server/dashboard/pulsco-ai-client';

interface AIPanelProps {
  onZoneRequest: (zone: IXAZone) => void;
}

export const AIPanel: React.FC<AIPanelProps> = ({ onZoneRequest }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [chatLog, setChatLog] = useState<{ role: "ai" | "user"; text: string }[]>([
    { role: "ai", text: "I am your planetary AI assistant. How can I assist you today?" }
  ]);

  const handleSend = async () => {
    if (!query.trim()) return;

    const userText = query;
    setChatLog((prev) => [...prev, { role: "user", text: userText }]);
    setQuery("");

    // Logic for Zone Switching commands
    if (userText.toLowerCase().includes("go to shop")) {
      onZoneRequest("shop");
      setChatLog((prev) => [...prev, { role: "ai", text: "Navigating to Shop Zone." }]);
      return;
    }

    // Integration with CSI Chatbot API
    try {
      // This would call the getAIResponse from pulsco-ai-client.ts
      // const response = await getAIResponse(userText);
      // setChatLog(prev => [...prev, { role: 'ai', text: response.message }]);

      // Simulated response for demonstration
      setTimeout(() => {
        setChatLog((prev) => [
          ...prev,
          { role: "ai", text: "Analyzing CSI reason-code context for your request..." }
        ]);
      }, 600);
    } catch (_err) {
      setChatLog((prev) => [
        ...prev,
        {
          role: "ai",
          text: "Connectivity to Intelligence Core interrupted. Reverting to local fallback."
        }
      ]);
    }
  };

  return (
    <div className="fixed bottom-8 right-32 z-50">
      {!isOpen ? (
        <button
          onClick={() => setIsOpen(true)}
          className="bg-stellar-purple-600 hover:bg-stellar-purple-500 text-tech-white p-lg rounded-full shadow-[0_0_30px_rgba(157,0,255,0.3)] transition-all hover:scale-110"
        >
          <Sparkles size={24} />
        </button>
      ) : (
        <Card className="w-80 md:w-96 bg-nebula-900! border-stellar-purple-500/30 overflow-hidden shadow-3xl animate-in zoom-in-95 duration-200">
          <div className="bg-stellar-purple-900/20 p-md border-b border-grid-silver/20 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Terminal size={16} className="text-stellar-purple-400" />
              <span className="font-mono text-xs font-bold tracking-wide text-tech-white">
                PULSCO AI
              </span>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-grid-silver hover:text-tech-white"
            >
              <X size={18} />
            </button>
          </div>

          <div className="h-80 overflow-y-auto p-md space-y-sm bg-black/20">
            {chatLog.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] p-sm rounded-2xl text-body ${
                    msg.role === "user"
                      ? "bg-cosmic-slate text-tech-white"
                      : "bg-stellar-purple-500/10 text-stellar-purple-100 border border-stellar-purple-500/20"
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            ))}
          </div>

          <div className="p-md bg-nebula-900 border-t border-grid-silver/10">
            <div className="flex gap-2">
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                placeholder="Type a command..."
                className="flex-1 bg-black/40 border-stellar-purple-500/30 text-tech-white"
              />
              <button
                onClick={handleSend}
                className="bg-stellar-purple-500 p-sm rounded-xl text-tech-white hover:bg-stellar-purple-400 transition-colors"
              >
                <Send size={18} />
              </button>
            </div>
            <div className="mt-sm flex gap-xs">
              <button
                onClick={() => onZoneRequest("me")}
                className="text-[10px] bg-grid-silver/10 hover:bg-grid-silver/20 px-2 py-1 rounded text-grid-silver transition-colors"
              >
                Go to Dashboard
              </button>
              <button
                onClick={() => onZoneRequest("discover")}
                className="text-[10px] bg-grid-silver/10 hover:bg-grid-silver/20 px-2 py-1 rounded text-grid-silver transition-colors"
              >
                Nearby Places
              </button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};
