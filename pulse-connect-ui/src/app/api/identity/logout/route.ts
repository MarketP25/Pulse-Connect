import { NextRequest, NextResponse } from "next/server";
import { getIdentityService } from "../_service";
import { assertCsrf, toErrorResponse } from "../_utils";

export async function POST(req: NextRequest) {
  try {
    assertCsrf(req);
    const body = await req.json().catch(() => ({}));
    const service = getIdentityService();
    if (body.sessionId) {
      await service.logout(body.sessionId);
    }

    const response = NextResponse.json({ ok: true });
    response.cookies.set("refresh_token", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/api/identity",
      maxAge: 0,
    });
    return response;
  } catch (error) {
    return toErrorResponse(error);
  }
}
