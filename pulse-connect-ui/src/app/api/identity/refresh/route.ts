import { NextRequest, NextResponse } from "next/server";
import { getIdentityService } from "../_service";
import { assertCsrf, getRequestIp, getUserAgent, toErrorResponse } from "../_utils";

export async function POST(req: NextRequest) {
  try {
    assertCsrf(req);
    const body = await req.json().catch(() => ({}));
    const refreshToken = req.cookies.get("refresh_token")?.value || body.refreshToken;
    if (!refreshToken) {
      return NextResponse.json({ code: "missing_refresh_token", message: "Refresh token is required" }, { status: 400 });
    }

    const service = getIdentityService();
    const tokens = await service.refreshTokens({
      refreshToken,
      ipAddress: getRequestIp(req),
      userAgent: getUserAgent(req),
    });

    const response = NextResponse.json({
      accessToken: tokens.accessToken,
      tokenType: tokens.tokenType,
      accessExpiresInSec: tokens.accessExpiresInSec,
      sessionId: tokens.sessionId,
    });
    response.cookies.set("refresh_token", tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/api/identity",
      maxAge: tokens.refreshExpiresInSec,
    });
    return response;
  } catch (error) {
    return toErrorResponse(error);
  }
}
