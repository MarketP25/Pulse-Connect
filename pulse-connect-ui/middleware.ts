import { NextRequest, NextResponse } from "next/server";

const TRUSTED_USER_HEADERS = ["x-authenticated-user-id", "x-dashboard-user-id", "x-user-id"];

function normalizeUserId(input: string | undefined | null): string | null {
  const value = (input || "").trim();
  if (!value) return null;
  if (value.length > 256) return null;
  return value;
}

function getTrustedHeaderUserId(req: NextRequest): string | null {
  for (const header of TRUSTED_USER_HEADERS) {
    const candidate = normalizeUserId(req.headers.get(header));
    if (candidate) return candidate;
  }
  return null;
}

export function middleware(req: NextRequest) {
  const headerUserId = getTrustedHeaderUserId(req);
  const cookieUserId =
    normalizeUserId(req.cookies.get("dashboard_user_id")?.value) ||
    normalizeUserId(req.cookies.get("user_id")?.value);
  const effectiveUserId = headerUserId || cookieUserId;

  const requestHeaders = new Headers(req.headers);
  if (effectiveUserId) {
    requestHeaders.set("x-dashboard-user-id", effectiveUserId);
    requestHeaders.set("x-user-id", effectiveUserId);
  }

  const response = NextResponse.next({
    request: {
      headers: requestHeaders
    }
  });

  if (headerUserId && headerUserId !== cookieUserId) {
    const options = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax" as const,
      path: "/"
    };
    response.cookies.set("dashboard_user_id", headerUserId, options);
    response.cookies.set("user_id", headerUserId, options);
  }

  return response;
}

export const config = {
  matcher: ["/dashboard/:path*", "/api/dashboard/:path*"]
};
