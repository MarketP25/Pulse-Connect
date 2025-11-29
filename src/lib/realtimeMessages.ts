import type { RealtimeState } from "@/context/RealtimeContext";

type RealtimeContextExtras = {
  role: string;
  org: string;
  language: string;
};

export const getRealtimeMessages = (
  state: RealtimeState,
  extras?: Partial<RealtimeContextExtras>
): string[] => {
  const { role, org, language } = extras || {};
  const messages: string[] = [];

  if (!state.isOnline) {
    messages.push(
      language === "fr"
        ? "Vous êtes hors ligne. Les appels sont désactivés."
        : "You're offline. Call features are disabled."
    );
  }

  if (!state.micEnabled) {
    messages.push(
      role === "team-lead"
        ? "Microphone access denied. Team leads require audio to manage sessions."
        : "Microphone access denied."
    );
  }

  if (!state.camEnabled) {
    messages.push(
      org === "Marketing"
        ? "Camera blocked. Video posts may not be available."
        : "Camera blocked."
    );
  }

  return messages;
};