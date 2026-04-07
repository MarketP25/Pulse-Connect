import { NextRequest } from "next/server";
import { updateOnboarding } from "@/server/dashboard/service";
import { getDashboardUserId, mapDashboardError, noStoreJson, parseJsonBody } from "../_utils";

export async function POST(req: NextRequest) {
  try {
    const userId = getDashboardUserId(req);
    const body = await parseJsonBody<{
      role?: "admin" | "individual" | "business" | "investor" | "partner" | "organisation";
      preferredLanguage?: string;
      referralCode?: string;
    }>(req);

    const result = await updateOnboarding(userId, {
      role: body.role,
      preferredLanguage: body.preferredLanguage,
      referralCode: body.referralCode
    });

    const response = noStoreJson(result);
    if (body.preferredLanguage) {
      response.cookies.set("preferred_language", body.preferredLanguage, {
        path: "/",
        sameSite: "lax"
      });
    }
    return response;
  } catch (error) {
    return mapDashboardError(error);
  }
}
