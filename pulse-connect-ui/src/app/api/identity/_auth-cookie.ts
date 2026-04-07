import { NextResponse } from "next/server";
import { verifyToken } from "@pulsco/pulse-identity-service";

const DASHBOARD_USER_COOKIE = "dashboard_user_id";
const LEGACY_USER_COOKIE = "user_id";
const DASHBOARD_SESSION_COOKIE = "dashboard_session_id";

type AccessTokenClaims = {
  sub: string;
  sid?: string;
  typ: string;
};

function cookieOptions(maxAgeSec?: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    ...(typeof maxAgeSec === "number" && maxAgeSec > 0 ? { maxAge: maxAgeSec } : {})
  };
}

function resolveJwtSecret(): string {
  return process.env.PULSE_IDENTITY_JWT_SECRET || "pulse-identity-dev-secret";
}

function parseAccessClaims(accessToken: string): AccessTokenClaims | null {
  try {
    const claims = verifyToken<AccessTokenClaims>(accessToken, resolveJwtSecret());
    if (claims.typ !== "access" || typeof claims.sub !== "string" || claims.sub.length === 0) {
      return null;
    }
    return claims;
  } catch {
    return null;
  }
}

export function setDashboardAuthCookiesFromAccessToken(
  response: NextResponse,
  accessToken: string,
  maxAgeSec?: number
) {
  const claims = parseAccessClaims(accessToken);
  if (!claims) return;

  const options = cookieOptions(maxAgeSec);
  response.cookies.set(DASHBOARD_USER_COOKIE, claims.sub, options);
  response.cookies.set(LEGACY_USER_COOKIE, claims.sub, options);
  if (claims.sid) {
    response.cookies.set(DASHBOARD_SESSION_COOKIE, claims.sid, options);
  }
}

export function clearDashboardAuthCookies(response: NextResponse) {
  const expiredOptions = { ...cookieOptions(), maxAge: 0 };
  response.cookies.set(DASHBOARD_USER_COOKIE, "", expiredOptions);
  response.cookies.set(LEGACY_USER_COOKIE, "", expiredOptions);
  response.cookies.set(DASHBOARD_SESSION_COOKIE, "", expiredOptions);
}
