import { NextRequest } from "next/server";
import { enableIdentityTwoFactor, getIdentityModule } from "@/server/dashboard/service";
import { getDashboardUserId, mapDashboardError, noStoreJson, parseJsonBody } from "../_utils";

export async function GET(req: NextRequest) {
  try {
    const userId = getDashboardUserId(req);
    const result = await getIdentityModule(userId);
    return noStoreJson(result);
  } catch (error) {
    return mapDashboardError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = getDashboardUserId(req);
    const body = await parseJsonBody<{ action?: "enable_2fa" }>(req);

    if (!body.action) {
      return noStoreJson({ code: "action_required", message: "action is required" }, 400);
    }

    if (body.action !== "enable_2fa") {
      return noStoreJson(
        { code: "unsupported_action", message: "Unsupported identity action" },
        400
      );
    }

    const result = await enableIdentityTwoFactor(userId);
    return noStoreJson(result);
  } catch (error) {
    return mapDashboardError(error);
  }
}
