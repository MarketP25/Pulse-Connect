import React from "react";

export const metadata = {
  title: "Privacy Policy | Pulsco"
};

export default async function PrivacyPage() {
  const candidates: string[] = [];
  if (process.env.EDGE_GATEWAY_URL)
    candidates.push(`${process.env.EDGE_GATEWAY_URL.replace(/\/$/, "")}/legal/privacy`);
  if (process.env.NEXT_PUBLIC_EDGE_GATEWAY_URL)
    candidates.push(`${process.env.NEXT_PUBLIC_EDGE_GATEWAY_URL.replace(/\/$/, "")}/legal/privacy`);
  // Unified origin fallback via Nginx: /edge/* is proxied to edge-gateway
  candidates.push("/edge/legal/privacy");

  let data: any = null;
  let lastError: unknown = null;
  for (const url of candidates) {
    try {
      const res = await fetch(url, { cache: "no-store" });
      if (res.ok) {
        data = await res.json();
        break;
      }
      lastError = new Error(`HTTP ${res.status}`);
    } catch (err) {
      lastError = err;
      continue;
    }
  }
  if (!data) throw lastError ?? new Error("Unable to fetch Privacy Policy");

  const { contentMarkdown, effectiveDate } = data ?? {};

  return (
    <main className="mx-auto max-w-4xl px-4 py-12 prose prose-invert">
      <h1>Pulsco Privacy Policy</h1>
      <p>
        <strong>Effective Date:</strong> {effectiveDate || "[Effective Date]"}
      </p>
      <pre className="whitespace-pre-wrap leading-relaxed text-sm sm:text-base">
        {contentMarkdown || "# Privacy Policy unavailable. Please try again later."}
      </pre>
    </main>
  );
}
