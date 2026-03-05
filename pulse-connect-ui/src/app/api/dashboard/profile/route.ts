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
      consents: snapshot.consents,
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
      role?: "individual" | "business" | "creator" | "partner" | "developer" | "enterprise" | "government";
      preferredLanguage?: "en" | "sw" | "fr" | "es";
      country?: string;
      city?: string;
    }>(req);

    const result = await updateProfile(userId, body);
    return noStoreJson(result);
  } catch (error) {
    return mapDashboardError(error);
  }
}
