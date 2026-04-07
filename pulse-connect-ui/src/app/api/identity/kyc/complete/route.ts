import { NextRequest, NextResponse } from "next/server";
import { getIdentityService } from "../../_service";
import { toErrorResponse } from "../../_utils";

function assertInternalWebhookAuth(req: NextRequest) {
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
    assertInternalWebhookAuth(req);
    const body = await req.json();
    const service = getIdentityService();
    const result = await service.completeKycWorkflow(
      body.userId,
      Boolean(body.approved),
      body.actorId || "kyc-provider",
      body.reason
    );
    return NextResponse.json(result);
  } catch (error) {
    return toErrorResponse(error);
  }
}
