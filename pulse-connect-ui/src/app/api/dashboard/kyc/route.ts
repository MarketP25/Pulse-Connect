import { NextRequest } from "next/server";
import { completeKyc } from "@/server/dashboard/service";
import { getDashboardUserId, mapDashboardError, noStoreJson, parseJsonBody } from "../_utils";

export async function POST(req: NextRequest) {
  try {
    const userId = getDashboardUserId(req);
    const body = await parseJsonBody<{ approved?: boolean }>(req);
    const result = await completeKyc(userId, body.approved ?? true);
    return noStoreJson(result);
  } catch (error) {
    return mapDashboardError(error);
  }
}
