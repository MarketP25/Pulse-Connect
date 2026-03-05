import { NextRequest } from "next/server";
import { recordDashboardInteraction } from "@/server/dashboard/service";
import { getDashboardUserId, mapDashboardError, noStoreJson, parseJsonBody } from "../_utils";

export async function POST(req: NextRequest) {
  try {
    const userId = getDashboardUserId(req);
    const body = await parseJsonBody<{
      eventType?: string;
      module?:
        | "core"
        | "profile"
        | "ecommerce"
        | "subscription"
        | "insights"
        | "places"
        | "matchmaking"
        | "communication"
        | "marketing"
        | "security"
        | "reporting"
        | "operations";
      metadata?: Record<string, string | number | boolean>;
    }>(req);

    if (!body.eventType || !body.module) {
      return noStoreJson({ code: "invalid_event", message: "eventType and module are required" }, 400);
    }

    const result = await recordDashboardInteraction({
      userId,
      eventType: body.eventType,
      module: body.module,
      metadata: body.metadata,
      timestamp: Date.now(),
    });

    return noStoreJson(result, 202);
  } catch (error) {
    return mapDashboardError(error);
  }
}
