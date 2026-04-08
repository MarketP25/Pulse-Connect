import { askPulscoAi, getPulscoAiStatus } from "@/server/dashboard/pulsco-ai-client";

describe("pulsco-ai client", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    delete process.env.PULSCO_CHATBOT_API_URL;
    delete process.env.PULSCO_BACKEND_CHATBOT_URL;
    delete process.env.PULSE_INTELLIGENCE_CORE_URL;
    delete process.env.PULSCO_INTELLIGENCE_CORE_URL;
    delete process.env.PULSCO_AI_API_URL;
    delete process.env.AI_COORDINATOR_URL;
  });

  it("reports fallback availability when no live AI URL is configured", () => {
    const status = getPulscoAiStatus();
    expect(status.available).toBe(true);
    expect(status.provider).toBe("pulsco-ai-fallback");
    expect(status.mode).toBe("fallback");
  });

  it("uses backend chatbot before direct AI engine when both are configured", async () => {
    process.env.PULSCO_CHATBOT_API_URL = "http://localhost:4020";
    process.env.PULSCO_AI_API_URL = "http://localhost:4010";
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ response: "Backend chatbot response" })
    } as Response);
    global.fetch = fetchMock;

    const result = await askPulscoAi({
      prompt: "hello",
      userId: "demo-basic",
      language: "en"
    });

    expect(result.mode).toBe("live");
    expect(result.provider).toBe("pulse-intelligence-chatbot");
    expect(result.response).toBe("Backend chatbot response");
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("http://localhost:4020"),
      expect.any(Object)
    );
  });

  it("uses direct AI engine when backend chatbot is unavailable", async () => {
    process.env.PULSCO_AI_API_URL = "http://localhost:4010";
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ response: "Live AI response" })
    } as Response);

    const result = await askPulscoAi({
      prompt: "hello",
      userId: "demo-basic",
      language: "en"
    });

    expect(result.mode).toBe("live");
    expect(result.provider).toBe("pulsco-ai-engine");
    expect(result.response).toBe("Live AI response");
  });

  it("falls back gracefully when live AI fails", async () => {
    process.env.PULSCO_AI_API_URL = "http://localhost:4010";
    global.fetch = jest.fn().mockRejectedValue(new Error("down"));

    const result = await askPulscoAi({
      prompt: "marketing tips",
      userId: "demo-basic",
      language: "en"
    });

    expect(result.mode).toBe("fallback");
    expect(result.provider).toBe("pulsco-ai-fallback");
    expect(result.response).toContain("localized campaigns");
  });
});
