import { NextRequest, NextResponse } from "next/server";
import { DashboardServiceError } from "@/server/dashboard/service";

export function getDashboardUserId(req: NextRequest): string {
  const url = new URL(req.url);
  return url.searchParams.get("userId") || req.headers.get("x-user-id") || "demo-basic";
}

export async function parseJsonBody<T extends Record<string, unknown>>(req: NextRequest): Promise<T> {
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
      "cache-control": "no-store",
    },
  });
}

export function mapDashboardError(error: unknown): NextResponse {
  if (error instanceof DashboardServiceError) {
    return noStoreJson(
      {
        code: error.code,
        message: error.message,
      },
      error.status,
    );
  }

  return noStoreJson(
    {
      code: "dashboard_route_error",
      message: error instanceof Error ? error.message : "Unknown dashboard error",
    },
    500,
  );
}
