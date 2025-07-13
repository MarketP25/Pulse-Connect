// src/components/PaymentButton.tsx
"use client";

import React from "react";
import { getBrowserRegion } from "@/lib/region";
import { REGION_GATEWAY, DEFAULT_GATEWAY, Gateway } from "@/config/paymentGateways";

interface Props {
  amount: number;
  onSuccess?: () => void;
}

export function PaymentButton({ amount, onSuccess }: Props) {
  const region = getBrowserRegion() || "";
  const gateway: Gateway = REGION_GATEWAY[region] || DEFAULT_GATEWAY;

  if (gateway === "mpesa") {
    return <button onClick={() => handleMpesa(amount)}>Pay with M-Pesa</button>;
  }
  if (gateway === "paystack") {
    return <button onClick={() => handlePaystack(amount, onSuccess)}>Pay with Paystack</button>;
  }
  if (gateway === "alipay") {
    return <button onClick={() => handleAlipay(amount)}>Pay with Alipay</button>;
  }
  return (
    <a
      href={`https://paypal.me/yourPayPalLink/${amount}`}
      target="_blank"
      rel="noopener noreferrer"
    >
      Pay with PayPal
    </a>
  );
}

// Local helper functions only—no API routes here!
async function handleMpesa(amount: number) { /* … */ }
async function handlePaystack(amount: number, onSuccess?: () => void) { /* … */ }
function handleAlipay(amount: number) { /* … */ }