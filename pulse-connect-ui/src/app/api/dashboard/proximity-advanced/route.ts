import { NextRequest } from "next/server";
import { getProximityAdvancedModule } from "@/server/dashboard/service";
import { getDashboardUserId, mapDashboardError, noStoreJson } from "../_utils";

export async function GET(req: NextRequest) {
  try {
    const userId = getDashboardUserId(req);
    const result = await getProximityAdvancedModule(userId);
    return noStoreJson(result);
  } catch (error) {
    return mapDashboardError(error);
  }
}
