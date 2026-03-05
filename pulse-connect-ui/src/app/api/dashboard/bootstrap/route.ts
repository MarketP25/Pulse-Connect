import { NextRequest } from "next/server";
import { getDashboardSnapshot } from "@/server/dashboard/service";
import { getDashboardUserId, mapDashboardError, noStoreJson } from "../_utils";

export async function GET(req: NextRequest) {
  try {
    const userId = getDashboardUserId(req);
    const snapshot = await getDashboardSnapshot(userId);
    return noStoreJson(snapshot);
  } catch (error) {
    return mapDashboardError(error);
  }
}
