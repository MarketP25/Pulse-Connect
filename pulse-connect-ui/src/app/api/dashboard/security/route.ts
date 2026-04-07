import { NextRequest } from "next/server";
import { getSecurityModule, updateSecurityModule } from "@/server/dashboard/service";
import { getDashboardUserId, mapDashboardError, noStoreJson, parseJsonBody } from "../_utils";

export async function GET(req: NextRequest) {
  try {
    const userId = getDashboardUserId(req);
    const result = await getSecurityModule(userId);
    return noStoreJson(result);
  } catch (error) {
    return mapDashboardError(error);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const userId = getDashboardUserId(req);
    const body = await parseJsonBody<{
      consents?: Partial<
        Record<
          | "privacyPolicy"
          | "termsOfService"
          | "dataProcessing"
          | "marketing"
          | "locationServices"
          | "profiling",
          boolean
        >
      >;
    }>(req);

    const result = await updateSecurityModule(userId, {
      consents: body.consents
    });

    return noStoreJson(result);
  } catch (error) {
    return mapDashboardError(error);
  }
}
