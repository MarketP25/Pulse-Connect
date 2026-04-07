import { askPulscoAi, getPulscoAiStatus } from "@/server/dashboard/pulsco-ai-client";

describe("pulsco-ai client", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    delete process.env.PULSCO_AI_API_URL;
    delete process.env.AI_COORDINATOR_URL;
  });

  it("reports fallback availability when no live AI URL is configured", () => {
    const status = getPulscoAiStatus();
    expect(status.available).toBe(true);
    expect(status.provider).toBe("pulsco-ai-fallback");
    expect(status.mode).toBe("fallback");
  });

  it("uses live PULSCO AI when endpoint responds", async () => {
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
    expect(result.provider).toBe("pulsco-ai-service");
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
