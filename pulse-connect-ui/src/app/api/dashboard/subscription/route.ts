import { NextRequest } from "next/server";
import { getDashboardSnapshot, updateSubscriptionTier } from "@/server/dashboard/service";
import { getDashboardUserId, mapDashboardError, noStoreJson, parseJsonBody } from "../_utils";

export async function GET(req: NextRequest) {
  try {
    const userId = getDashboardUserId(req);
    const snapshot = await getDashboardSnapshot(userId);
    return noStoreJson({
      tier: snapshot.user.tier,
      kycStatus: snapshot.user.kycStatus,
      access: snapshot.access
    });
  } catch (error) {
    return mapDashboardError(error);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const userId = getDashboardUserId(req);
    const body = await parseJsonBody<{ tier?: "basic" | "premium" | "enterprise" }>(req);

    if (!body.tier) {
      return noStoreJson({ code: "tier_required", message: "tier is required" }, 400);
    }

    const result = await updateSubscriptionTier(userId, { tier: body.tier });
    return noStoreJson(result);
  } catch (error) {
    return mapDashboardError(error);
  }
}
