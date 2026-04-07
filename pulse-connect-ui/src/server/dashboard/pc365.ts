import { createHash, createHmac } from "crypto";

function getCpc365Key(): string {
  return process.env.PC365_KEY || process.env.PC_365_MASTER_TOKEN || "pulsco-pc365-dev-key";
}

export function maskEmail(email: string): string {
  const [localPart, domain = "hidden.local"] = email.split("@");
  if (!localPart) {
    return `***@${domain}`;
  }
  if (localPart.length <= 2) {
    return `${localPart[0] || "*"}***@${domain}`;
  }
  return `${localPart.slice(0, 2)}***@${domain}`;
}

export function hashSensitive(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function signPayload(payload: unknown): string {
  const body = JSON.stringify(payload);
  return createHmac("sha256", getCpc365Key()).update(body).digest("hex");
}
