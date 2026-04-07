import { NextRequest, NextResponse } from "next/server";
import { createHmac } from "node:crypto";

const DASHBOARD_ROLE = "superadmin";
const DASHBOARD_SOURCE = "superadmin-dashboard";
const PC365_GUARD_SECRET =
  process.env.ADMIN_GUARD_SIGNING_SECRET || process.env.PC365_GUARD_SIGNING_SECRET || "";

function validateRoleContext(req: NextRequest): boolean {
  const incomingRole = req.headers.get("x-admin-role");
  return !incomingRole || incomingRole === DASHBOARD_ROLE;
}

function allowSameSiteRequest(req: NextRequest): boolean {
  const fetchSite = req.headers.get("sec-fetch-site");
  return !fetchSite || fetchSite === "same-origin" || fetchSite === "same-site";
}

function getGatewayUrl(): string {
  return process.env.ADMIN_GATEWAY_URL || "http://localhost:3001";
}

function resolveFounderApproval(req: NextRequest, body?: Record<string, unknown>): boolean {
  const headerDecision = req.headers.get("x-founder-approved");
  if (headerDecision === "true") return true;
  if (headerDecision === "false") return false;

  if (body && typeof body.founderApproved === "boolean") {
    return body.founderApproved;
  }

  return process.env.DASHBOARD_FOUNDER_APPROVED === "true";
}

function resolveActorId(req: NextRequest, body?: Record<string, unknown>): string {
  const fromHeader = req.headers.get("x-admin-id");
  if (fromHeader) return fromHeader;

  const fromBody = body?.actorId || body?.actor || body?.triggeredBy;
  if (typeof fromBody === "string" && fromBody.trim()) return fromBody.trim();

  return "superadmin-session";
}

function buildPc365Guard(founderApproved: boolean, actorId?: string): string {
  if (!PC365_GUARD_SECRET) {
    if (process.env.NODE_ENV !== "production") {
      const fallbackPayload = Buffer.from(
        JSON.stringify({
          role: DASHBOARD_ROLE,
          founderApproved,
          source: `${DASHBOARD_SOURCE}-dev-fallback`,
          actorId,
          issuedAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 120_000).toISOString()
        }),
        "utf8"
      ).toString("base64url");
      return `${fallbackPayload}.dev`;
    }
    throw new Error("ADMIN_GUARD_SIGNING_SECRET must be configured for production.");
  }

  const payload = Buffer.from(
    JSON.stringify({
      role: DASHBOARD_ROLE,
      founderApproved,
      source: DASHBOARD_SOURCE,
      actorId,
      issuedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 120_000).toISOString()
    }),
    "utf8"
  ).toString("base64url");
  const signature = createHmac("sha256", PC365_GUARD_SECRET).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

export async function GET(req: NextRequest) {
  if (!validateRoleContext(req)) {
    return new NextResponse("Forbidden - invalid role context", { status: 403 });
  }

  if (!allowSameSiteRequest(req)) {
    return new NextResponse("Forbidden - cross-site requests are not allowed", { status: 403 });
  }

  const scope = req.nextUrl.searchParams.get("scope");
  const routeSuffix = scope ? `?scope=${encodeURIComponent(scope)}` : "";

  try {
    const guardToken = buildPc365Guard(false);

    const response = await fetch(`${getGatewayUrl()}/api/admin/emergency-protocol${routeSuffix}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "x-admin-role": DASHBOARD_ROLE,
        "x-pc365-guard": guardToken
      },
      cache: "no-store"
    });

    const payload = await response.text();
    return new NextResponse(payload, {
      status: response.status,
      headers: {
        "Content-Type": response.headers.get("content-type") || "application/json",
        "Cache-Control": "no-store"
      }
    });
  } catch (error) {
    console.error(`${DASHBOARD_SOURCE} emergency protocol GET failed`, error);
    return new NextResponse("Failed to fetch emergency protocol state", { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!validateRoleContext(req)) {
    return new NextResponse("Forbidden - invalid role context", { status: 403 });
  }

  if (!allowSameSiteRequest(req)) {
    return new NextResponse("Forbidden - cross-site requests are not allowed", { status: 403 });
  }

  try {
    const body = (await req.json()) as Record<string, unknown>;
    const founderApproved = resolveFounderApproval(req, body);
    const actorId = resolveActorId(req, body);
    const guardToken = buildPc365Guard(founderApproved, actorId);

    const response = await fetch(`${getGatewayUrl()}/api/admin/emergency-protocol`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-admin-role": DASHBOARD_ROLE,
        "x-pc365-guard": guardToken
      },
      body: JSON.stringify({
        ...body,
        actorId,
        source: DASHBOARD_SOURCE,
        timestamp: new Date().toISOString()
      }),
      cache: "no-store"
    });

    const payload = await response.text();
    return new NextResponse(payload, {
      status: response.status,
      headers: {
        "Content-Type": response.headers.get("content-type") || "application/json",
        "Cache-Control": "no-store"
      }
    });
  } catch (error) {
    console.error(`${DASHBOARD_SOURCE} emergency protocol POST failed`, error);
    return new NextResponse("Failed to mutate emergency protocol", { status: 500 });
  }
}
