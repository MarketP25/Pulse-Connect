import { NextRequest, NextResponse } from "next/server";
import { getIdentityService } from "../../_service";
import { assertCsrf, toErrorResponse } from "../../_utils";

export async function GET(req: NextRequest) {
  try {
    assertCsrf(req);
    const url = new URL(req.url);
    const userId = url.searchParams.get("userId");
    if (!userId) {
      return NextResponse.json(
        { code: "missing_user_id", message: "userId is required" },
        { status: 400 },
      );
    }

    const service = getIdentityService();
    const status = await service.getOnboardingStatus(userId);
    return NextResponse.json(status);
  } catch (error) {
    return toErrorResponse(error);
  }
}
