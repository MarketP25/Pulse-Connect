import { createVerify } from "crypto";

export type SignatureEncoding = "base64" | "base64url" | "hex";

export interface SignatureVerifierConfig {
  publicKey: string;
  algorithm?: string;
}

function normalizePublicKey(key: string): string {
  const trimmed = (key || "").trim();
  if (!trimmed) {
    return "";
  }
  if (trimmed.includes("BEGIN PUBLIC KEY") || trimmed.includes("BEGIN RSA PUBLIC KEY")) {
    return trimmed;
  }
  // If the key is base64-encoded PEM, decode it.
  try {
    return Buffer.from(trimmed, "base64").toString("utf8");
  } catch {
    return trimmed;
  }
}

function looksLikeHex(input: string): boolean {
  return /^[0-9a-fA-F]+$/.test(input) && input.length % 2 === 0;
}

function decodeSignature(signature: string): Buffer | null {
  const raw = (signature || "").trim();
  if (!raw) return null;
  if (looksLikeHex(raw)) {
    return Buffer.from(raw, "hex");
  }
  // base64url -> base64
  const base64 = raw.replace(/-/g, "+").replace(/_/g, "/");
  try {
    return Buffer.from(base64, "base64");
  } catch {
    return null;
  }
}

export function verifySignature(
  payload: string | Buffer,
  signature: string,
  config: SignatureVerifierConfig
): boolean {
  const publicKey = normalizePublicKey(config.publicKey);
  if (!publicKey) return false;

  const sig = decodeSignature(signature);
  if (!sig) return false;

  const algorithm = config.algorithm || "RSA-SHA256";
  const verifier = createVerify(algorithm);
  verifier.update(payload);
  verifier.end();
  return verifier.verify(publicKey, sig);
}
