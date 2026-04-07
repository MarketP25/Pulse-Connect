import { NextRequest, NextResponse } from "next/server";
import { DashboardServiceError } from "@/server/dashboard/service";

export function getDashboardUserId(req: NextRequest): string {
  const url = new URL(req.url);
  const fromHeader =
    req.headers.get("x-user-id") ||
    req.headers.get("x-authenticated-user-id") ||
    req.headers.get("x-dashboard-user-id");
  const fromCookie =
    req.cookies.get("dashboard_user_id")?.value || req.cookies.get("user_id")?.value;
  const fromQuery = url.searchParams.get("userId");

  const trustedIdentity = fromHeader || fromCookie;
  if (process.env.NODE_ENV === "production") {
    if (trustedIdentity) return trustedIdentity;

    throw new DashboardServiceError(
      "dashboard_auth_required",
      401,
      "Missing authenticated dashboard user context"
    );
  }

  if (trustedIdentity) return trustedIdentity;
  if (fromQuery) return fromQuery;

  return "demo-basic";
}

export function getDashboardPreferredLanguage(req: NextRequest): string | undefined {
  const url = new URL(req.url);
  const fromQuery = url.searchParams.get("lang") || url.searchParams.get("language");
  if (fromQuery) {
    return fromQuery.trim().toLowerCase();
  }

  const fromHeader = req.headers.get("x-preferred-language") || req.headers.get("accept-language");
  if (fromHeader) {
    const first = fromHeader.split(",")[0]?.trim();
    if (first) {
      return first.toLowerCase().split("-")[0];
    }
  }

  const fromCookie = req.cookies.get("preferred_language")?.value;
  if (fromCookie) {
    return fromCookie.trim().toLowerCase();
  }

  return undefined;
}

export async function parseJsonBody<T extends Record<string, unknown>>(
  req: NextRequest
): Promise<T> {
  try {
    return (await req.json()) as T;
  } catch {
    return {} as T;
  }
}

export function noStoreJson(payload: unknown, status = 200) {
  return NextResponse.json(payload, {
    status,
    headers: {
      "cache-control": "no-store"
    }
  });
}

export function mapDashboardError(error: unknown): NextResponse {
  if (error instanceof DashboardServiceError) {
    return noStoreJson(
      {
        code: error.code,
        message: error.message
      },
      error.status
    );
  }

  return noStoreJson(
    {
      code: "dashboard_route_error",
      message: error instanceof Error ? error.message : "Unknown dashboard error"
    },
    500
  );
}
