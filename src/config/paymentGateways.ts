// src/config/paymentGateways.ts
export type Gateway = "mpesa" | "paystack" | "alipay" | "paypal";

export const REGION_GATEWAY: Record<string, Gateway> = {
  KE: "mpesa",
  NG: "paystack",
  GH: "paystack",
  CN: "alipay",
};

export const DEFAULT_GATEWAY: Gateway = "paypal";