import crypto from "crypto";

function safeTimingEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

function parseSignatureHeader(signature: string): { timestamp?: string; candidates: string[] } {
  const raw = (signature || "").trim();
  if (!raw) return { candidates: [] };

  // Stripe-style: "t=...,v1=...,v1=..."
  if (raw.includes("v1=") || raw.includes("t=")) {
    const parts = raw.split(",").map((p) => p.trim());
    let timestamp: string | undefined;
    const candidates: string[] = [];
    for (const p of parts) {
      const [k, v] = p.split("=", 2);
      if (!k || v === undefined) continue;
      if (k === "t") timestamp = v;
      if (k === "v1") candidates.push(v);
    }
    if (candidates.length) return { timestamp, candidates };
  }

  // Common prefixes: "sha256=..."
  const withoutPrefix = raw.startsWith("sha256=") ? raw.slice("sha256=".length) : raw;
  return { candidates: [withoutPrefix] };
}

function hmacSha256Hex(secret: string, message: string): string {
  return crypto.createHmac("sha256", secret).update(message, "utf8").digest("hex");
}

function hmacSha256Base64(secret: string, message: string): string {
  return crypto.createHmac("sha256", secret).update(message, "utf8").digest("base64");
}

/**
 * Verify webhook signature using HMAC-SHA256.
 *
 * Supports:
 * - Simple signatures: hex/base64, optionally prefixed with "sha256="
 * - Stripe-style headers: "t=timestamp,v1=signature"
 * - Secret rotation via comma-separated `webhookSecret`.
 */
export function verifyWebhookSignatureHmacSha256(payload: string, signature: string, webhookSecret?: string): boolean {
  if (!webhookSecret) return false;
  const { timestamp, candidates } = parseSignatureHeader(signature);
  if (!candidates.length) return false;

  const secrets = webhookSecret
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (!secrets.length) return false;

  for (const secret of secrets) {
    const expectedHex = hmacSha256Hex(secret, payload);
    const expectedB64 = hmacSha256Base64(secret, payload);

    // Stripe-style: HMAC over `${t}.${payload}`
    const expectedStripeHex = timestamp ? hmacSha256Hex(secret, `${timestamp}.${payload}`) : null;
    const expectedStripeB64 = timestamp ? hmacSha256Base64(secret, `${timestamp}.${payload}`) : null;

    for (const cand of candidates) {
      const c = cand.trim();
      if (!c) continue;

      if (safeTimingEqual(c, expectedHex)) return true;
      if (safeTimingEqual(c, expectedB64)) return true;
      if (expectedStripeHex && safeTimingEqual(c, expectedStripeHex)) return true;
      if (expectedStripeB64 && safeTimingEqual(c, expectedStripeB64)) return true;
    }
  }

  return false;
}

