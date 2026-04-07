import { NextRequest } from "next/server";
import {
  getPartnerInvestorApplications,
  submitPartnerInvestorApplication
} from "@/server/dashboard/service";
import { getDashboardUserId, mapDashboardError, noStoreJson, parseJsonBody } from "../_utils";

export async function GET(req: NextRequest) {
  try {
    const userId = getDashboardUserId(req);
    const result = await getPartnerInvestorApplications(userId, "partner");
    return noStoreJson(result);
  } catch (error) {
    return mapDashboardError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = getDashboardUserId(req);
    const body = await parseJsonBody<Record<string, unknown>>(req);
    const result = await submitPartnerInvestorApplication(userId, "partner", body);
    return noStoreJson(result, 201);
  } catch (error) {
    return mapDashboardError(error);
  }
}
