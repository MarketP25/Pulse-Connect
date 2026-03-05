import { NextRequest, NextResponse } from "next/server";

const DASHBOARD_ROLE = "dpo";

function resolvePc365Token(req: NextRequest): string {
  const headerToken = req.headers.get("x-pc365-attestation");
  if (headerToken) return headerToken;

  const serviceToken = process.env.DASHBOARD_PC365_ATTESTATION || process.env.PC365_ATTESTATION_TOKEN;
  if (serviceToken) return serviceToken;

  if (process.env.NODE_ENV !== "production") {
    return "pc365-dev-attestation";
  }

  return "";
}

function allowSameSiteRequest(req: NextRequest): boolean {
  const fetchSite = req.headers.get("sec-fetch-site");
  return !fetchSite || fetchSite === "same-origin" || fetchSite === "same-site";
}

export async function GET(req: NextRequest) {
  if (!allowSameSiteRequest(req)) {
    return new NextResponse("Forbidden - cross-site requests are not allowed", { status: 403 });
  }

  const pc365Token = resolvePc365Token(req);
  if (!pc365Token) {
    return new NextResponse("Unauthorized - PC365 attestation required", { status: 401 });
  }

  try {
    const gatewayUrl = process.env.ADMIN_GATEWAY_URL || "http://localhost:3001";
    const response = await fetch(`${gatewayUrl}/api/admin/intelligence?role=${DASHBOARD_ROLE}&action=metrics`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "x-admin-role": DASHBOARD_ROLE,
        "x-pc365-attestation": pc365Token,
      },
      cache: "no-store",
    });

    const payload = await response.text();
    return new NextResponse(payload, {
      status: response.status,
      headers: {
        "Content-Type": response.headers.get("content-type") || "application/json",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("dpo-dashboard metrics GET failed", error);
    return new NextResponse("Failed to fetch DPO metrics", { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!allowSameSiteRequest(req)) {
    return new NextResponse("Forbidden - cross-site requests are not allowed", { status: 403 });
  }

  const pc365Token = resolvePc365Token(req);
  if (!pc365Token) {
    return new NextResponse("Unauthorized - PC365 attestation required", { status: 401 });
  }

  try {
    const body = await req.json();
    const gatewayUrl = process.env.ADMIN_GATEWAY_URL || "http://localhost:3001";
    const founderApproved = req.headers.get("x-founder-approved") || process.env.DASHBOARD_FOUNDER_APPROVED || "false";

    const response = await fetch(`${gatewayUrl}/api/admin/events`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-admin-role": DASHBOARD_ROLE,
        "x-pc365-attestation": pc365Token,
        "x-founder-approved": founderApproved,
      },
      body: JSON.stringify({
        ...body,
        source: "dpo-dashboard",
        timestamp: new Date().toISOString(),
      }),
      cache: "no-store",
    });

    const payload = await response.text();
    return new NextResponse(payload, {
      status: response.status,
      headers: {
        "Content-Type": response.headers.get("content-type") || "application/json",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("dpo-dashboard metrics POST failed", error);
    return new NextResponse("Failed to submit DPO event", { status: 500 });
  }
}
