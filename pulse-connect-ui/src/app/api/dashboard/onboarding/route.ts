import { NextRequest } from "next/server";
import { updateOnboarding } from "@/server/dashboard/service";
import { getDashboardUserId, mapDashboardError, noStoreJson, parseJsonBody } from "../_utils";

export async function POST(req: NextRequest) {
  try {
    const userId = getDashboardUserId(req);
    const body = await parseJsonBody<{
      role?: "individual" | "business" | "creator" | "partner" | "developer" | "enterprise" | "government";
      preferredLanguage?: "en" | "sw" | "fr" | "es";
      referralCode?: string;
    }>(req);

    const result = await updateOnboarding(userId, {
      role: body.role,
      preferredLanguage: body.preferredLanguage,
      referralCode: body.referralCode,
    });

    return noStoreJson(result);
  } catch (error) {
    return mapDashboardError(error);
  }
}
