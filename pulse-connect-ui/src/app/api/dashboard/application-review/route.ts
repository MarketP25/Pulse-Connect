import { NextRequest } from "next/server";
import { reviewPartnerInvestorApplication } from "@/server/dashboard/service";
import { mapDashboardError, noStoreJson, parseJsonBody } from "../_utils";

export async function POST(req: NextRequest) {
  try {
    const body = await parseJsonBody<{
      applicationId?: string;
      decision?: "approved" | "rejected";
      reviewer?: string;
      notes?: string;
    }>(req);

    if (!body.applicationId || !body.decision) {
      return noStoreJson({ message: "Missing required fields" }, 400);
    }

    const reviewer = body.reviewer || req.headers.get("x-admin-role") || "admin";
    const result = await reviewPartnerInvestorApplication(
      body.applicationId,
      body.decision,
      reviewer,
      body.notes
    );
    return noStoreJson(result);
  } catch (error) {
    return mapDashboardError(error);
  }
}
