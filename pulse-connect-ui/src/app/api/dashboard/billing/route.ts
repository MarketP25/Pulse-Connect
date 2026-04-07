import { NextRequest } from "next/server";
import { getBillingModule, runBillingAction } from "@/server/dashboard/service";
import { getDashboardUserId, mapDashboardError, noStoreJson, parseJsonBody } from "../_utils";

export async function GET(req: NextRequest) {
  try {
    const userId = getDashboardUserId(req);
    const result = await getBillingModule(userId);
    return noStoreJson(result);
  } catch (error) {
    return mapDashboardError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = getDashboardUserId(req);
    const body = await parseJsonBody<{
      action?: "create" | "renew" | "upgrade" | "cancel";
      payload?: Record<string, unknown>;
    }>(req);

    if (!body.action) {
      return noStoreJson({ code: "action_required", message: "action is required" }, 400);
    }

    const result = await runBillingAction(userId, body.action, body.payload);
    return noStoreJson(result);
  } catch (error) {
    return mapDashboardError(error);
  }
}
