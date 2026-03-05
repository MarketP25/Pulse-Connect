import { BASE_DASHBOARD_DICTIONARY } from "@/lib/dashboard/i18n";
import { translateDashboardDictionary } from "@/server/dashboard/localization-client";

describe("translateDashboardDictionary", () => {
  it("returns identity dictionary for english", async () => {
    const result = await translateDashboardDictionary(BASE_DASHBOARD_DICTIONARY, "en", "en");
    expect(result.provider).toBe("identity");
    expect(result.dictionary.title).toBe(BASE_DASHBOARD_DICTIONARY.title);
  });

  it("falls back to localization dictionary when external localization endpoint is unavailable", async () => {
    delete process.env.PULSCO_LOCALIZATION_API_URL;
    delete process.env.LOCALIZATION_API_URL;
    delete process.env.AZURE_TRANSLATOR_ENDPOINT;
    delete process.env.AZURE_TRANSLATOR_KEY;

    const result = await translateDashboardDictionary(BASE_DASHBOARD_DICTIONARY, "sw", "en");
    expect(result.provider).toBe("localization-fallback");
    expect(result.dictionary.title).toBe("Dashibodi ya Mtumiaji ya PULSCO");
  });
});
