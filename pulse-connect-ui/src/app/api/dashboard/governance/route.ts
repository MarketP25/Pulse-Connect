import { NextRequest } from "next/server";
import {
  getGovernanceModule,
  requestGovernanceArbitration,
  reviewCsiRecommendation
} from "@/server/dashboard/service";
import { getDashboardUserId, mapDashboardError, noStoreJson, parseJsonBody } from "../_utils";

export async function GET(req: NextRequest) {
  try {
    const userId = getDashboardUserId(req);
    const result = await getGovernanceModule(userId);
    return noStoreJson(result);
  } catch (error) {
    return mapDashboardError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = getDashboardUserId(req);
    const body = await parseJsonBody<{
      action?: "request_arbitration" | "review_recommendation";
      recommendationId?: string;
      decision?: "approved" | "rejected";
    }>(req);

    if (!body.action) {
      return noStoreJson({ code: "action_required", message: "action is required" }, 400);
    }

    if (body.action === "request_arbitration") {
      const result = await requestGovernanceArbitration(userId);
      return noStoreJson(result);
    }

    if (!body.recommendationId || !body.decision) {
      return noStoreJson(
        { code: "review_params_required", message: "recommendationId and decision are required" },
        400
      );
    }

    const result = await reviewCsiRecommendation(userId, body.recommendationId, body.decision);
    return noStoreJson(result);
  } catch (error) {
    return mapDashboardError(error);
  }
}
