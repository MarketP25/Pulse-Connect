import { NextRequest } from "next/server";
import { getReportingModule } from "@/server/dashboard/service";
import { getDashboardUserId, mapDashboardError, noStoreJson } from "../_utils";

export async function GET(req: NextRequest) {
  try {
    const userId = getDashboardUserId(req);
    const result = await getReportingModule(userId);
    return noStoreJson(result);
  } catch (error) {
    return mapDashboardError(error);
  }
}

