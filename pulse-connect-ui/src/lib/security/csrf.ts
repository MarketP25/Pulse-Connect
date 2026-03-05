function randomToken(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function getCsrfToken(): string {
  if (typeof document === "undefined") {
    return "";
  }

  const existing = document.cookie
    .split(";")
    .map((entry) => entry.trim())
    .find((entry) => entry.startsWith("csrf_token="));

  if (existing) {
    return decodeURIComponent(existing.split("=")[1] || "");
  }

  const token = randomToken();
  document.cookie = `csrf_token=${encodeURIComponent(token)}; Path=/; SameSite=Strict`;
  return token;
}
