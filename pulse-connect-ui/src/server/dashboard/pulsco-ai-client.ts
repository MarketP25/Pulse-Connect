export interface PulscoAiStatus {
  available: boolean;
  provider: string;
  mode: "live" | "fallback";
}

export interface PulscoAiChatResult extends PulscoAiStatus {
  response: string;
}

function normalizeBaseUrl(url: string): string {
  return url.endsWith("/") ? url.slice(0, -1) : url;
}

function getAiBaseUrl(): string {
  return (
    process.env.PULSCO_AI_API_URL ||
    process.env.AI_COORDINATOR_URL ||
    ""
  );
}

function fallbackResponse(prompt: string): string {
  const lower = prompt.toLowerCase();

  if (lower.includes("fraud")) {
    return "PULSCO AI: Fraud posture is stable. Keep PC365 attestation enabled for sensitive operations.";
  }
  if (lower.includes("upgrade") || lower.includes("tier")) {
    return "PULSCO AI: Subscription upgrades are available in Subscription Management; paid tiers require full KYC.";
  }
  if (lower.includes("marketing")) {
    return "PULSCO AI: Focus spend on localized campaigns with CTR above 5% and pause low-conversion channels.";
  }

  return "PULSCO AI: I can assist with profile settings, KYC, tier access, ecommerce, and optimization actions.";
}

function extractResponse(payload: Record<string, unknown>): string | null {
  const candidates = [payload.response, payload.answer, payload.output, payload.message];
  for (const value of candidates) {
    if (typeof value === "string" && value.trim().length > 0) {
      return value;
    }
  }

  if (typeof payload.data === "object" && payload.data !== null) {
    const nested = payload.data as Record<string, unknown>;
    const nestedCandidates = [nested.response, nested.answer, nested.output, nested.message];
    for (const value of nestedCandidates) {
      if (typeof value === "string" && value.trim().length > 0) {
        return value;
      }
    }
  }

  return null;
}

async function tryLiveAi(baseUrl: string, prompt: string, userId: string, language: string): Promise<string | null> {
  const endpoints = [
    `${normalizeBaseUrl(baseUrl)}/chat`,
    `${normalizeBaseUrl(baseUrl)}/v1/chat`,
    `${normalizeBaseUrl(baseUrl)}/api/v1/chat`,
    `${normalizeBaseUrl(baseUrl)}/ask`,
  ];

  for (const endpoint of endpoints) {
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-pulsco-source-app": "@pulsco/pulse-connect-ui",
        },
        cache: "no-store",
        body: JSON.stringify({
          prompt,
          userId,
          language,
          context: "dashboard",
        }),
      });

      if (!response.ok) {
        continue;
      }

      const payload = (await response.json().catch(() => ({}))) as Record<string, unknown>;
      const text = extractResponse(payload);
      if (text) {
        return text;
      }
    } catch {
      // Continue trying known endpoints.
    }
  }

  return null;
}

export function getPulscoAiStatus(): PulscoAiStatus {
  const baseUrl = getAiBaseUrl();
  if (!baseUrl) {
    return {
      available: true,
      provider: "pulsco-ai-fallback",
      mode: "fallback",
    };
  }

  return {
    available: true,
    provider: "pulsco-ai-service",
    mode: "live",
  };
}

export async function askPulscoAi(params: {
  prompt: string;
  userId: string;
  language: string;
}): Promise<PulscoAiChatResult> {
  const baseUrl = getAiBaseUrl();

  if (baseUrl) {
    const liveResponse = await tryLiveAi(baseUrl, params.prompt, params.userId, params.language);
    if (liveResponse) {
      return {
        response: liveResponse,
        available: true,
        provider: "pulsco-ai-service",
        mode: "live",
      };
    }
  }

  return {
    response: fallbackResponse(params.prompt),
    available: true,
    provider: "pulsco-ai-fallback",
    mode: "fallback",
  };
}
