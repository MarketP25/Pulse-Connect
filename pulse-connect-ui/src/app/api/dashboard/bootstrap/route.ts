import { NextRequest } from "next/server";
import { getDashboardSnapshot } from "@/server/dashboard/service";
import {
  getDashboardPreferredLanguage,
  getDashboardUserId,
  mapDashboardError,
  noStoreJson
} from "../_utils";

export async function GET(req: NextRequest) {
  try {
    const userId = getDashboardUserId(req);
    const preferredLanguage = getDashboardPreferredLanguage(req);
    const snapshot = await getDashboardSnapshot(userId, { preferredLanguage });
    return noStoreJson(snapshot);
  } catch (error) {
    return mapDashboardError(error);
  }
}
