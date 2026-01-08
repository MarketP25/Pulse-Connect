import { NextResponse } from "next/server";
import { AdminService } from "@/lib/services/admin";
import { checkRateLimit } from "@/lib/rateLimit";
import { logger } from "@/lib/logger";

export async function POST(request: Request) {
  try {
    const ip = request.headers.get("x-forwarded-for") || "127.0.0.1";
    const rateLimit = await checkRateLimit(ip, "API");

    if (!rateLimit.success) {
      return NextResponse.json({ error: rateLimit.message }, { status: 429 });
    }

    const { email } = await request.json();

    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { error: "Email is required and must be a string" },
        { status: 400 }
      );
    }

    const adminCode = await AdminService.createAdminCode(email);

    return NextResponse.json(
      {
        message: "Admin code created successfully",
        adminCode
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    logger.error(
      { error: error instanceof Error ? error.message : String(error) },
      "Failed to create admin code"
    );

    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as any).code === "MAX_ADMINS_REACHED"
    ) {
      return NextResponse.json(
        { error: (error as any).message || "Max admins reached" },
        { status: 403 }
      );
    }

    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET() {
  try {
    const adminCodes = await AdminService.listAdminCodes();
    return NextResponse.json(adminCodes, { status: 200 });
  } catch (error: unknown) {
    logger.error(
      { error: error instanceof Error ? error.message : String(error) },
      "Failed to list admin codes"
    );
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
