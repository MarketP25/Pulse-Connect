import { NextResponse } from "next/server";
import { verifyStripeWebhook } from "@/lib/services/payment/stripe";
import { verifyPaystackPayment } from "@/lib/services/payment/paystack";
import { updateBookingStatus } from "@/lib/services/booking";
import { logger } from "@/lib/logger";

export async function POST(req: Request) {
  try {
    // Read raw body
    const body = await req.text();

    // Use Request.headers directly (always a Headers instance)
    const stripeSignature = req.headers.get("stripe-signature");
    const paystackReference = req.headers.get("x-paystack-reference");

    // 🔐 Stripe webhook handling
    if (stripeSignature) {
      const event = await verifyStripeWebhook(Buffer.from(body), stripeSignature);

      switch (event.type) {
        case "checkout.session.completed": {
          const session = event.data.object;
          const bookingId = session.metadata?.bookingId;
          if (bookingId) {
            await updateBookingStatus(bookingId, "confirmed", session.payment_intent as string);
          }
          break;
        }
        case "payment_intent.payment_failed": {
          const session = event.data.object;
          const bookingId = session.metadata?.bookingId;
          if (bookingId) {
            await updateBookingStatus(bookingId, "cancelled");
          }
          break;
        }
      }
    }

    // 🔐 Paystack webhook handling
    if (paystackReference) {
      const isValid = await verifyPaystackPayment(paystackReference);
      if (isValid) {
        let webhookBody: any;
        try {
          webhookBody = JSON.parse(body);
        } catch (parseError) {
          logger.warn("Failed to parse Paystack webhook body:", parseError);
          return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
        }

        const bookingId = webhookBody?.data?.metadata?.bookingId;
        if (bookingId) {
          await updateBookingStatus(bookingId, "confirmed", webhookBody.data.reference);
        }
      }
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error: unknown) {
    logger.error(
      { error: error instanceof Error ? error.message : String(error) },
      "Webhook processing failed"
    );
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 400 });
  }
}
