import { NextRequest } from "next/server";
import { getLocalizedDashboardDictionary } from "@/server/dashboard/service";
import { getDashboardUserId, mapDashboardError, noStoreJson } from "../_utils";

export async function GET(req: NextRequest) {
  try {
    const userId = getDashboardUserId(req);
    const url = new URL(req.url);
    const language = url.searchParams.get("language") || undefined;
    const result = await getLocalizedDashboardDictionary(userId, language || undefined);
    return noStoreJson(result);
  } catch (error) {
    return mapDashboardError(error);
  }
}
