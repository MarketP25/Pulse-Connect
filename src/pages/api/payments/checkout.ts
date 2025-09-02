import { NextResponse } from "next/server";
import Stripe from "stripe";

const stripeSecretKey = process.env.STRIPE_SECRET_KEY!;
const baseUrl = process.env.NEXT_PUBLIC_BASE_URL!;
const paypalMeLink = process.env.PAYPAL_ME_LINK!;
const paystackSecretKey = process.env.PAYSTACK_SECRET_KEY!;

const stripe = new Stripe(stripeSecretKey, { apiVersion: "2025-06-30.basil" });

function getCurrencyForRegion(region: string | undefined): string {
  const currencyMap: Record<string, string> = {
    KE: "kes",
    US: "usd",
    EU: "eur",
    NG: "ngn"
  };
  return currencyMap[region ?? ""] || "usd";
}

function validateBody(body: any) {
  const supportedGateways = ["stripe", "paypal", "mpesa", "paystack", "alipay"];
  if (!supportedGateways.includes(body.gateway)) throw new Error("Unsupported payment gateway.");
  if (typeof body.amount !== "number" || body.amount <= 0)
    throw new Error("Invalid payment amount.");
  if (typeof body.email !== "string") throw new Error("Missing or invalid email.");
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { amount, currency, description, email, gateway, locale, region } = body;
    validateBody(body);

    const chosenCurrency = currency || getCurrencyForRegion(region);
    const unitAmount = Math.round(amount * 100);

    const metadata = {
      email,
      gateway,
      region: region || "global",
      app: "pulse-connect",
      description: description || "Pulse Connect Payment"
    };

    // [CLEANED] Removed debug log

    // Stripe & Alipay Checkout
    if (gateway === "stripe" || gateway === "alipay") {
      const session = await stripe.checkout.sessions.create({
        payment_method_types: [gateway],
        line_items: [
          {
            price_data: {
              currency: chosenCurrency,
              product_data: { name: metadata.description },
              unit_amount: unitAmount
            },
            quantity: 1
          }
        ],
        mode: "payment",
        customer_email: email,
        success_url: `${baseUrl}/success`,
        cancel_url: `${baseUrl}/cancel`,
        locale: locale || "auto",
        metadata
      });
      return NextResponse.json({ url: session.url });
    }

    // PayPal
    if (gateway === "paypal") {
      const paypalUrl = `${paypalMeLink}/${amount}`;
      return NextResponse.json({ url: paypalUrl });
    }

    // M-Pesa integration (calls your existing push.ts logic)
    if (gateway === "mpesa") {
      const res = await fetch(`${baseUrl}/api/mpesa/push`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount, currency: chosenCurrency, description, email, region })
      });
      const data = await res.json();
      if (data.url || data.status === "pending") {
        return NextResponse.json(data);
      } else {
        return NextResponse.json({ error: "M-Pesa push failed.", details: data }, { status: 500 });
      }
    }

    // Paystack
    if (gateway === "paystack") {
      const paystackBody = {
        email,
        amount: unitAmount,
        currency: chosenCurrency,
        callback_url: `${baseUrl}/success`,
        metadata
      };
      const res = await fetch("https://api.paystack.co/transaction/initialize", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${paystackSecretKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(paystackBody)
      });
      const data = await res.json();
      if (data.status && data.data?.authorization_url) {
        return NextResponse.json({ url: data.data.authorization_url });
      } else {
        return NextResponse.json(
          { error: "Paystack init failed.", details: data },
          { status: 500 }
        );
      }
    }

    // Fallback
    return NextResponse.json({ error: "Unhandled gateway." }, { status: 400 });
  } catch (err: any) {
    console.error("[Checkout Error]", err);
    const message = err?.message || "Unexpected payment failure.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
