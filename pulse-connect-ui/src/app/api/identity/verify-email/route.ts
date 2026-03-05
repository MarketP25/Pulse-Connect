import { NextRequest, NextResponse } from "next/server";
import { getIdentityService } from "../_service";
import { assertCsrf, getRequestIp, getUserAgent, toErrorResponse } from "../_utils";

export async function POST(req: NextRequest) {
  try {
    assertCsrf(req);
    const body = await req.json();
    const service = getIdentityService();
    const result = await service.verifyEmail({
      token: body.token,
      ipAddress: getRequestIp(req),
      userAgent: getUserAgent(req),
    });
    return NextResponse.json(result);
  } catch (error) {
    return toErrorResponse(error);
  }
}
