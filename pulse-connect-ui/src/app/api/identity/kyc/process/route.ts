import { NextRequest, NextResponse } from "next/server";
import { getIdentityService } from "../../_service";
import { assertCsrf, toErrorResponse } from "../../_utils";

function assertInternalKycAuth(req: NextRequest) {
  const expected = process.env.PULSE_KYC_WEBHOOK_SECRET;
  if (!expected) {
    return;
  }
  const provided = req.headers.get("x-kyc-webhook-secret");
  if (!provided || provided !== expected) {
    throw new Error("kyc_webhook_unauthorized");
  }
}

export async function POST(req: NextRequest) {
  try {
    // Allow either browser-driven CSRF-protected call or internal secret-auth call.
    try {
      assertCsrf(req);
    } catch {
      assertInternalKycAuth(req);
    }

    const body = await req.json();
    const userId = body.userId;
    if (!userId) {
      return NextResponse.json(
        { code: "missing_user_id", message: "userId is required" },
        { status: 400 }
      );
    }

    const service = getIdentityService();
    const result = await service.autoProcessKyc(
      userId,
      {
        ipRiskScore: typeof body.ipRiskScore === "number" ? body.ipRiskScore : undefined,
        deviceConsistency:
          typeof body.deviceConsistency === "boolean" ? body.deviceConsistency : undefined,
        referralTrusted:
          typeof body.referralTrusted === "boolean" ? body.referralTrusted : undefined,
        documentCompleteness:
          typeof body.documentCompleteness === "number" ? body.documentCompleteness : undefined
      },
      body.actorId || "kyc-automation-bot"
    );

    return NextResponse.json(result);
  } catch (error) {
    return toErrorResponse(error);
  }
}
