import { NextRequest } from "next/server";
import {
  getMatchmakingOperationsModule,
  runMatchmakingOperationsAction
} from "@/server/dashboard/service";
import { getDashboardUserId, mapDashboardError, noStoreJson, parseJsonBody } from "../_utils";

export async function GET(req: NextRequest) {
  try {
    const userId = getDashboardUserId(req);
    const result = await getMatchmakingOperationsModule(userId);
    return noStoreJson(result);
  } catch (error) {
    return mapDashboardError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = getDashboardUserId(req);
    const body = await parseJsonBody<{
      action?: "create_brief" | "submit_proposal" | "create_contract";
      payload?: Record<string, unknown>;
    }>(req);

    if (!body.action) {
      return noStoreJson({ code: "action_required", message: "action is required" }, 400);
    }

    const result = await runMatchmakingOperationsAction(userId, body.action, body.payload || {});
    return noStoreJson(result);
  } catch (error) {
    return mapDashboardError(error);
  }
}
