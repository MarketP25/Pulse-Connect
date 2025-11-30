// src/pages/api/mpesa/push.ts
import type { NextApiRequest, NextApiResponse } from "next";

type DarajaAuth = { access_token: string };

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // 1) Only accept POST
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).end("Method Not Allowed");
  }

  const { phone, amount } = req.body as {
    phone?: string;
    amount?: number;
  };

  // 2) Basic payload validation
  if (!phone || !amount) {
    return res
      .status(400)
      .json({ error: "Request body must include `phone` and `amount`." });
  }

  try {
    // 3) Get OAuth token
    const authRes = await fetch(
      "https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials",
      {
        headers: {
          Authorization: `Basic ${Buffer.from(
            `${process.env.MPESA_CONSUMER_KEY}:${process.env.MPESA_CONSUMER_SECRET}`
          ).toString("base64")}`,
        },
      }
    );
    if (!authRes.ok) throw new Error("OAuth token fetch failed");
    const { access_token }: DarajaAuth = await authRes.json();

    // 4) Build STK Push payload
    const timestamp = new Date()
      .toISOString()
      .replace(/[-:TZ.]/g, "")
      .slice(0, 14);
    const password = Buffer.from(
      `${process.env.MPESA_SHORTCODE}${process.env.MPESA_PASSKEY}${timestamp}`
    ).toString("base64");

    // 5) Send STK Push
    const pushRes = await fetch(
      "https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${access_token}`,
        },
        body: JSON.stringify({
          BusinessShortCode: process.env.MPESA_SHORTCODE,
          Password: password,
          Timestamp: timestamp,
          TransactionType: "CustomerPayBillOnline",
          Amount: amount,
          PartyA: phone, // ← fixed typo here
          PartyB: process.env.MPESA_SHORTCODE,
          PhoneNumber: phone,
          CallBackURL: `${process.env.BASE_URL}/api/mpesa/callback`,
          AccountReference: "PulseConnect",
          TransactionDesc: "Subscription payment",
        }),
      }
    );
    if (!pushRes.ok) {
      const text = await pushRes.text();
      return res.status(pushRes.status).json({ error: text });
    }

    const data = await pushRes.json();
    return res.status(200).json(data);
  } catch (err: any) {
    // ...existing code...
    return res.status(500).json({ error: err.message || "Internal error" });
  }
}
