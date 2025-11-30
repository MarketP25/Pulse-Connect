import { NextResponse } from "next/server";
import { AdminService } from "@/lib/services/admin";
import { logger } from "@/lib/logger";
import { getServerSession } from "next-auth";

export async function DELETE(
  request: Request,
  { params }: { params: { code: string } }
) {
  try {
    const session = await getServerSession();
    const role = session?.user?.role || "GUEST";

    const success = await AdminService.revokeCode(params.code, role);

    if (!success) {
      return NextResponse.json(
        { error: "Admin code not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { message: "Admin code revoked successfully" },
      { status: 200 }
    );
  } catch (error: unknown) {
    logger.error(
      {
        error: error instanceof Error ? error.message : String(error),
        code: params.code,
      },
      "Failed to revoke admin code"
    );

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
