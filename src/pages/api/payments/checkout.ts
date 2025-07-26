import { NextResponse } from "next/server";
import Stripe from "stripe";
// Use global fetch in Node.js 18+ or Next.js

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
const paypalMeLink = process.env.PAYPAL_ME_LINK; // Add this to your .env or config

const stripe = new Stripe(stripeSecretKey!, { apiVersion: "2025-06-30.basil" });

export async function POST(req: Request) {
  try {
    // Parse and validate input
    const body = await req.json();
    const { amount, currency, description, email, gateway } = body;

    const supportedGateways = ["stripe", "paypal", "mpesa", "paystack", "alipay"];
    if (!gateway || !supportedGateways.includes(gateway)) {
      return NextResponse.json({ error: "Invalid or missing payment gateway." }, { status: 400 });
    }

    if (!amount || typeof amount !== "number" || amount <= 0) {
      return NextResponse.json({ error: "Invalid or missing amount." }, { status: 400 });
    }
    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "Missing or invalid email." }, { status: 400 });
    }
    if (!baseUrl) {
      return NextResponse.json({ error: "Server misconfiguration: missing NEXT_PUBLIC_BASE_URL." }, { status: 500 });
    }

    // Optionally log the payment attempt (for debugging/audit)
    console.log("[Payment Attempt]", { amount, currency, description, email, gateway });

    if (gateway === "stripe") {
      // Create Stripe Checkout session for card payments
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: [
          {
            price_data: {
              currency: currency || "usd",
              product_data: { name: description || "Pulse Connect Payment" },
              unit_amount: Math.round(amount * 100), // Stripe expects cents
            },
            quantity: 1,
          },
        ],
        mode: "payment",
        customer_email: email,
        success_url: `${baseUrl}/success`,
        cancel_url: `${baseUrl}/cancel`,
      });
      return NextResponse.json({ url: session.url });
    } else if (gateway === "alipay") {
      // Create Stripe Checkout session for Alipay payments
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["alipay"],
        line_items: [
          {
            price_data: {
              currency: currency || "usd",
              product_data: { name: description || "Pulse Connect Payment" },
              unit_amount: Math.round(amount * 100),
            },
            quantity: 1,
          },
        ],
        mode: "payment",
        customer_email: email,
        success_url: `${baseUrl}/success`,
        cancel_url: `${baseUrl}/cancel`,
      });
      return NextResponse.json({ url: session.url });
    } else if (gateway === "paypal") {
      // Return PayPal.me link (frontend should handle the redirect)
      if (!paypalMeLink) {
        return NextResponse.json({ error: "PayPal.me link not configured." }, { status: 500 });
      }
      // Optionally, you can append amount to the PayPal.me link if supported
      const paypalUrl = `${paypalMeLink}/${amount}`;
      return NextResponse.json({ url: paypalUrl });
    } else if (gateway === "mpesa") {
      // TODO: Integrate real Mpesa API here
      // For now, return a placeholder message or redirect URL
      return NextResponse.json({
        message: "Mpesa payment support coming soon. Please use Stripe or PayPal for now.",
        info: "You can use your local Mpesa account or card with Stripe or PayPal to fund Pulse Connect globally."
      });
    } else if (gateway === "paystack") {
      // Real Paystack integration (basic session creation)
      const paystackSecretKey = process.env.PAYSTACK_SECRET_KEY;
      if (!paystackSecretKey) {
        return NextResponse.json({ error: "Paystack secret key not configured." }, { status: 500 });
      }
      // Paystack expects amount in kobo (NGN) or the smallest currency unit
      const paystackAmount = Math.round(amount * 100);
      const paystackCallbackUrl = `${baseUrl}/success`;
      const paystackBody = {
        email,
        amount: paystackAmount,
        currency: currency || "NGN",
        callback_url: paystackCallbackUrl,
        metadata: {
          description: description || "Pulse Connect Payment"
        }
      };
      const paystackRes = await fetch("https://api.paystack.co/transaction/initialize", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${paystackSecretKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(paystackBody)
      });
      const paystackData = await paystackRes.json();
      if (paystackData.status && paystackData.data && paystackData.data.authorization_url) {
        return NextResponse.json({ url: paystackData.data.authorization_url });
      } else {
        return NextResponse.json({ error: "Failed to initialize Paystack payment.", details: paystackData }, { status: 500 });
      }
    }
    // Fallback (should not reach here)
    return NextResponse.json({ error: "Unsupported payment gateway." }, { status: 400 });
  } catch (err: any) {
    // Log error for debugging
    console.error("[Payment API Error]", err);
    if (err?.type === "StripeCardError" || err?.raw?.message) {
      return NextResponse.json({ error: err.raw.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Payment processing failed. Please try again later." }, { status: 500 });
  }
}
