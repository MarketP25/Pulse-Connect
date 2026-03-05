import { NextRequest, NextResponse } from "next/server";
import { IdentityError } from "@pulsco/pulse-identity-service";

export function getRequestIp(req: NextRequest): string {
  const forwardedFor = req.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }
  return req.headers.get("x-real-ip") || "127.0.0.1";
}

export function getUserAgent(req: NextRequest): string {
  return req.headers.get("user-agent") || "unknown-agent";
}

export function assertCsrf(req: NextRequest): void {
  const headerToken = req.headers.get("x-csrf-token");
  const cookieToken = req.cookies.get("csrf_token")?.value;

  if (!headerToken || !cookieToken || headerToken !== cookieToken) {
    throw new IdentityError("csrf_validation_failed", 403, "CSRF validation failed");
  }
}

export function toErrorResponse(error: unknown): NextResponse {
  if (error instanceof IdentityError) {
    return NextResponse.json(
      {
        code: error.code,
        message: error.message,
        details: error.details,
      },
      { status: error.status },
    );
  }

  return NextResponse.json(
    {
      code: "identity_route_error",
      message: error instanceof Error ? error.message : "Unknown route error",
    },
    { status: 500 },
  );
}
