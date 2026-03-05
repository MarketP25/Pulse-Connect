import { LOCALE_REGION_MAPPING, Locale } from "@/config/lang";

type SignupPayload = {
  email: string;
  password: string;
  role: string;
  language: Locale;
  referralCode?: string;
  username?: string;
  city?: string;
  subscriptionTier?: "basic" | "premium" | "enterprise";
  csrfToken: string;
};

export async function createUser(payload: SignupPayload) {
  const username = payload.username || payload.email.split("@")[0];
  const country = LOCALE_REGION_MAPPING[payload.language] || "US";

  const response = await fetch("/api/identity/register", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-csrf-token": payload.csrfToken,
      "idempotency-key": `register-${payload.email.toLowerCase()}`,
    },
    body: JSON.stringify({
      email: payload.email,
      password: payload.password,
      username,
      role: payload.role,
      preferredLanguage: payload.language,
      country,
      city: payload.city,
      referralCode: payload.referralCode,
      subscriptionTier: payload.subscriptionTier || "basic",
      consents: {
        privacyPolicy: { accepted: true, version: "2026.03" },
        termsOfService: { accepted: true, version: "2026.03" },
        dataProcessing: { accepted: true, version: "2026.03" },
        marketing: { accepted: false, version: "2026.03" },
      },
      deviceFingerprint: `${navigator.userAgent}:${navigator.language}:signup`,
    }),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.message || "Failed to create account");
  }

  return response.json();
}

export async function loginUser(params: {
  email: string;
  password: string;
  csrfToken: string;
  deviceFingerprint: string;
}) {
  const response = await fetch("/api/identity/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-csrf-token": params.csrfToken,
    },
    body: JSON.stringify({
      email: params.email,
      password: params.password,
      deviceFingerprint: params.deviceFingerprint,
    }),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.message || "Login failed");
  }

  return response.json();
}

export async function refreshSession(csrfToken: string) {
  const response = await fetch("/api/identity/refresh", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-csrf-token": csrfToken,
    },
    body: JSON.stringify({}),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.message || "Session refresh failed");
  }

  return response.json();
}

export async function logoutUser(csrfToken: string, sessionId?: string) {
  const response = await fetch("/api/identity/logout", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-csrf-token": csrfToken,
    },
    body: JSON.stringify({ sessionId }),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.message || "Logout failed");
  }
}
