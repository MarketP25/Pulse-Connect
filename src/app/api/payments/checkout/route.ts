import { NextResponse } from "next/server";
import { PaymentRequestSchema, createPayment } from "@/lib/services/payment";
import { validateRequestBody } from "@/lib/api/errors";
import { logger } from "@/lib/logger";

export async function POST(req: Request) {
  try {
    // 1. Validate request body
    const body = await validateRequestBody(req, PaymentRequestSchema);

    // 2. Create payment session
    const result = await createPayment(body);

    // 3. Handle payment creation result
    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Payment creation failed" },
        { status: 400 }
      );
    }

    // 4. Return success response
    return NextResponse.json({
      success: true,
      sessionId: result.sessionId,
      url: result.url,
      metadata: result.metadata
    });
  } catch (error) {
    logger.error("Payment checkout failed:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
