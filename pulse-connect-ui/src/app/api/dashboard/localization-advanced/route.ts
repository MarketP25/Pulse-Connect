import { NextRequest } from "next/server";
import { getLocalizedDashboardDictionary, getLocalizationAdvancedModule } from "@/server/dashboard/service";
import { getDashboardUserId, mapDashboardError, noStoreJson } from "../_utils";

export async function GET(req: NextRequest) {
  try {
    const userId = getDashboardUserId(req);
    const url = new URL(req.url);
    const language = url.searchParams.get("language") || undefined;
    const [dictionaryResult, advancedResult] = await Promise.all([
      getLocalizedDashboardDictionary(userId, language),
      getLocalizationAdvancedModule(userId),
    ]);

    return noStoreJson({
      ...advancedResult,
      dictionary: dictionaryResult.dictionary,
      provider: dictionaryResult.provider,
      language: dictionaryResult.language,
    });
  } catch (error) {
    return mapDashboardError(error);
  }
}

