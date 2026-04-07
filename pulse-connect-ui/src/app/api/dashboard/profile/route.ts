import { NextRequest } from "next/server";
import { getDashboardSnapshot, updateProfile } from "@/server/dashboard/service";
import { getDashboardUserId, mapDashboardError, noStoreJson, parseJsonBody } from "../_utils";

export async function GET(req: NextRequest) {
  try {
    const userId = getDashboardUserId(req);
    const snapshot = await getDashboardSnapshot(userId);
    return noStoreJson({
      user: snapshot.user,
      access: snapshot.access,
      consents: snapshot.consents
    });
  } catch (error) {
    return mapDashboardError(error);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const userId = getDashboardUserId(req);
    const body = await parseJsonBody<{
      displayName?: string;
      role?: "individual" | "business" | "admin" | "partner" | "investor" | "organisation";
      preferredLanguage?: string;
      country?: string;
      city?: string;
    }>(req);

    const result = await updateProfile(userId, body);
    const response = noStoreJson(result);
    if (body.preferredLanguage) {
      response.cookies.set("preferred_language", body.preferredLanguage, {
        path: "/",
        sameSite: "lax"
      });
    }
    if (body.country) {
      response.cookies.set("preferred_region", body.country, {
        path: "/",
        sameSite: "lax"
      });
    }
    return response;
  } catch (error) {
    return mapDashboardError(error);
  }
}
