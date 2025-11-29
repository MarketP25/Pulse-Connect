// src/components/PaymentButton.tsx
"use client";

import React, { useState } from "react";
import styles from "./PaymentButton.module.css";
import { getBrowserRegion } from "@/lib/region";
import {
  REGION_GATEWAY,
  DEFAULT_GATEWAY,
  Gateway,
} from "@/config/paymentGateways";
import { PAYPAL_ME_LINK } from "@/config/paymentGateways";
import { useLanguage } from "../context/LanguageProvider"; // Correct import path for useLanguage

interface Props {
  amount: number;
  currency?: string;
  description?: string;
  email?: string;
  planId?: string;
  productId?: string;
  onSuccess?: () => void;
}

export function PaymentButton({
  amount,
  currency = "USD",
  description = "Pulse Connect Payment",
  email = "",
  onSuccess,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const region = getBrowserRegion() || "";
  const gateway: Gateway = REGION_GATEWAY[region] || DEFAULT_GATEWAY;
  const locale = useLanguage().lang; // Add dynamic locale support

  const handlePayment = async () => {
    setLoading(true);
    setError("");
    setSuccess(false);
    try {
      // Always use backend for all gateways
      const res = await fetch("/api/payments/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount, currency, description, email, gateway }),
      });
      const data = await res.json();
      if (data.url) {
        // For PayPal, open in new tab; for others, redirect
        if (gateway === "paypal") {
          window.open(data.url, "_blank");
        } else {
          window.location.href = data.url;
        }
        setSuccess(true);
        onSuccess?.();
        return;
      } else if (data.message) {
        // For placeholder gateways (Mpesa, etc.)
        setError(data.message + (data.info ? ` (${data.info})` : ""));
      } else {
        throw new Error(data.error || "Payment failed.");
      }
    } catch (err) {
      if (err instanceof Error) {
        setError(`Payment failed: ${err.message}`); // Handle error properly
      } else {
        setError("Payment failed: Unknown error");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <button onClick={handlePayment} disabled={loading}>
        {loading
          ? "Processing..."
          : `Pay with ${gateway.charAt(0).toUpperCase() + gateway.slice(1)}`}
      </button>
      {error && <div className={styles.error}>{error}</div>}
      {success && <div className={styles.success}>Payment successful!</div>}
    </div>
  );
}
