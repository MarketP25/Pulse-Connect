import { randomBytes } from "crypto";

export function generateVerificationToken(): string {
  // Generate a random 32-character token
  return randomBytes(16).toString("hex");
}
