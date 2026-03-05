import { geocodeWithProximity } from "@/server/dashboard/proximity-client";

describe("geocodeWithProximity", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    delete process.env.PULSCO_PROXIMITY_API_URL;
    delete process.env.PROXIMITY_API_URL;
  });

  it("uses proximity response when geocoding succeeds", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ lat: 1.23, lng: 4.56, formatted_address: "Mock Address" }),
    } as Response);

    const result = await geocodeWithProximity("Test City, US");
    expect(result.source).toBe("proximity");
    expect(result.latitude).toBe(1.23);
    expect(result.longitude).toBe(4.56);
  });

  it("falls back when proximity service is unavailable", async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error("connection failed"));

    const result = await geocodeWithProximity("Austin, US");
    expect(result.source).toBe("fallback");
    expect(result.latitude).toBeCloseTo(30.2672, 4);
  });
});
