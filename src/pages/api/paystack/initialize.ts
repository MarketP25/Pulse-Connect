// src/pages/api/paystack/initialize.ts
import type { NextApiRequest, NextApiResponse } from "next";
import axios from "axios";

type PaystackInitResponse = {
  status: boolean;
  message: string;
  data: {
    authorization_url: string;
    access_code: string;
    reference: string;
  };
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { amount, email } = req.body;

  try {
    const { data } = await axios.post<PaystackInitResponse>(
      "https://api.paystack.co/transaction/initialize",
      {
        amount: amount * 100,
        email: email || "no-reply@pulseconnect.com",
        callback_url: `${process.env.BASE_URL}/api/paystack/callback`,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET}`,
        },
      }
    );

    return res.status(200).json(data);
  } catch (error: any) {
    console.error("Paystack init error:", error.response?.data || error.message);
    return res.status(500).json({
      status: false,
      message: "Could not initialize Paystack transaction",
    });
  }
}