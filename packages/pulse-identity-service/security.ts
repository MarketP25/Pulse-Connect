import bcrypt from "bcryptjs";
import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes } from "crypto";
import { IdentityError } from "./errors";
import { SecurityPrecheckInput } from "./types";

type JwtPayloadBase = {
  sub: string;
  sid: string;
  typ: "access" | "refresh" | "verify_email";
  rot?: number;
  [key: string]: unknown;
};

export interface RateLimiter {
  hit(
    key: string,
    windowMs: number,
    maxRequests: number
  ): Promise<{ allowed: boolean; remaining: number }>;
}

export class InMemoryRateLimiter implements RateLimiter {
  private buckets = new Map<string, number[]>();

  async hit(key: string, windowMs: number, maxRequests: number) {
    const now = Date.now();
    const bucket = this.buckets.get(key) || [];
    const trimmed = bucket.filter((ts) => now - ts <= windowMs);
    trimmed.push(now);
    this.buckets.set(key, trimmed);
    return {
      allowed: trimmed.length <= maxRequests,
      remaining: Math.max(0, maxRequests - trimmed.length)
    };
  }
}

const BOT_SIGNATURES = [/bot/i, /crawler/i, /spider/i, /headless/i, /curl\//i, /wget\//i];

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function normalizeUsername(username: string): string {
  return username.trim().toLowerCase();
}

export function assertStrongPassword(password: string): void {
  const minLen = 12;
  if (
    password.length < minLen ||
    !/[A-Z]/.test(password) ||
    !/[a-z]/.test(password) ||
    !/\d/.test(password) ||
    !/[^a-zA-Z0-9]/.test(password)
  ) {
    throw new IdentityError(
      "weak_password",
      400,
      "Password does not meet strong policy requirements",
      { minLen, uppercase: true, lowercase: true, number: true, specialCharacter: true }
    );
  }
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

function base64UrlEncode(input: string | Buffer): string {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function base64UrlDecode(input: string): Buffer {
  const base64 = input.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
  return Buffer.from(padded, "base64");
}

function signJwtSegment(value: string, secret: string): string {
  return createHmac("sha256", secret).update(value).digest("base64url");
}

export function signToken(payload: JwtPayloadBase, secret: string, expiresInSec: number): string {
  const header = { alg: "HS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const fullPayload = { ...payload, iat: now, exp: now + expiresInSec };
  const h = base64UrlEncode(JSON.stringify(header));
  const p = base64UrlEncode(JSON.stringify(fullPayload));
  const signature = signJwtSegment(`${h}.${p}`, secret);
  return `${h}.${p}.${signature}`;
}

export function verifyToken<TPayload = JwtPayloadBase>(token: string, secret: string): TPayload {
  const parts = token.split(".");
  if (parts.length !== 3) {
    throw new IdentityError("invalid_token", 401, "Token format is invalid");
  }

  const [h, p, sig] = parts;
  const expected = signJwtSegment(`${h}.${p}`, secret);
  if (sig !== expected) {
    throw new IdentityError("invalid_token_signature", 401, "Token signature is invalid");
  }

  const payload = JSON.parse(base64UrlDecode(p).toString("utf8")) as TPayload & { exp?: number };
  const now = Math.floor(Date.now() / 1000);
  if (typeof payload.exp === "number" && payload.exp < now) {
    throw new IdentityError("token_expired", 401, "Token expired");
  }

  return payload as TPayload;
}

export function hashValue(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function getEncryptionKey(): Buffer {
  const source = process.env.PULSE_IDENTITY_ENCRYPTION_KEY;
  if (!source) {
    if (process.env.NODE_ENV === "production") {
      throw new IdentityError(
        "missing_encryption_key",
        500,
        "PULSE_IDENTITY_ENCRYPTION_KEY must be configured in production"
      );
    }
    return createHash("sha256").update("pulsco-identity-dev-key").digest();
  }
  return createHash("sha256").update(source).digest();
}

export function encryptSensitive(plainText: string): string {
  const iv = randomBytes(12);
  const key = getEncryptionKey();
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(plainText, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("base64")}.${tag.toString("base64")}.${encrypted.toString("base64")}`;
}

export function decryptSensitive(cipherText: string): string {
  const [ivB64, tagB64, bodyB64] = cipherText.split(".");
  if (!ivB64 || !tagB64 || !bodyB64) {
    throw new IdentityError("invalid_cipher_text", 400, "Encrypted value format is invalid");
  }
  const key = getEncryptionKey();
  const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(ivB64, "base64"));
  decipher.setAuthTag(Buffer.from(tagB64, "base64"));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(bodyB64, "base64")),
    decipher.final()
  ]);
  return decrypted.toString("utf8");
}

export function isBotUserAgent(userAgent: string): boolean {
  return BOT_SIGNATURES.some((signature) => signature.test(userAgent));
}

export function isSuspiciousIp(ipAddress: string): boolean {
  const denyList = (process.env.PULSE_IDENTITY_BLOCKED_IPS || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  if (denyList.length === 0) {
    return false;
  }

  return denyList.includes(ipAddress);
}

export function deriveDeviceFingerprint(deviceFingerprint: string, userAgent: string): string {
  return hashValue(`${deviceFingerprint}:${userAgent}`);
}

export async function assertSecurityPrechecks(
  input: SecurityPrecheckInput,
  rateLimiter: RateLimiter,
  maxRequests = 25,
  windowMs = 60_000
): Promise<void> {
  const key = `${input.intent}:${input.ipAddress}`;
  const rateResult = await rateLimiter.hit(key, windowMs, maxRequests);
  if (!rateResult.allowed) {
    throw new IdentityError("rate_limited", 429, "Too many requests from this IP");
  }

  if (isBotUserAgent(input.userAgent)) {
    throw new IdentityError("bot_detected", 403, "Automated/bot clients are blocked");
  }

  if (isSuspiciousIp(input.ipAddress)) {
    throw new IdentityError("suspicious_ip", 403, "IP address is blocked by security policy");
  }

  if (!input.deviceFingerprint || input.deviceFingerprint.trim().length < 8) {
    throw new IdentityError("invalid_device_fingerprint", 400, "Device fingerprint is required");
  }
}
