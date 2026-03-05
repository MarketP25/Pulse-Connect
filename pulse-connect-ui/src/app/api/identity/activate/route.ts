import { NextRequest, NextResponse } from "next/server";
import { getIdentityService } from "../_service";
import { assertCsrf, toErrorResponse } from "../_utils";

export async function POST(req: NextRequest) {
  try {
    assertCsrf(req);
    const body = await req.json();
    const service = getIdentityService();
    const result = await service.activateAccount(body.userId, body.actorId || "identity-service");
    return NextResponse.json(result);
  } catch (error) {
    return toErrorResponse(error);
  }
}
