import { NextRequest, NextResponse } from "next/server";
import { getIdentityService } from "../_service";
import { assertCsrf, getRequestIp, getUserAgent, toErrorResponse } from "../_utils";

export async function POST(req: NextRequest) {
  try {
    assertCsrf(req);
    const body = await req.json();
    const service = getIdentityService();

    const result = await service.registerUser({
      email: body.email,
      password: body.password,
      username: body.username,
      role: body.role,
      preferredLanguage: body.preferredLanguage,
      country: body.country,
      city: body.city,
      referralCode: body.referralCode,
      subscriptionTier: body.subscriptionTier,
      consents: body.consents,
      phoneVerified: body.phoneVerified,
      deviceFingerprint: body.deviceFingerprint,
      ipAddress: getRequestIp(req),
      userAgent: getUserAgent(req),
      idempotencyKey: req.headers.get("idempotency-key") || body.idempotencyKey,
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
