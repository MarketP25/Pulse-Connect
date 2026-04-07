import React from "react";

export const metadata = {
  title: "Terms of Service | Pulsco"
};

async function fetchTerms() {
  const candidates: string[] = [];
  if (process.env.EDGE_GATEWAY_URL)
    candidates.push(`${process.env.EDGE_GATEWAY_URL.replace(/\/$/, "")}/legal/terms`);
  if (process.env.NEXT_PUBLIC_EDGE_GATEWAY_URL)
    candidates.push(`${process.env.NEXT_PUBLIC_EDGE_GATEWAY_URL.replace(/\/$/, "")}/legal/terms`);
  // Relative path option: use /edge/legal/terms since /edge/* is proxied to edge-gateway
  candidates.push("/edge/legal/terms");

  let lastError: unknown = null;
  for (const url of candidates) {
    try {
      const res = await fetch(url, { cache: "no-store" });
      if (res.ok) {
        return await res.json();
      }
      lastError = new Error(`HTTP ${res.status}`);
    } catch (err) {
      lastError = err;
      continue;
    }
  }
  throw lastError ?? new Error("Unable to fetch Terms of Service");
}

export default async function TermsPage() {
  const data = await fetchTerms();
  const { contentMarkdown, effectiveDate, governingLaw, legalEntity, version } = data ?? {};

  return (
    <main className="mx-auto max-w-4xl px-4 py-12 prose prose-invert">
      <h1>Pulsco Terms of Service</h1>
      <p>
        <strong>Effective Date:</strong> {effectiveDate || "[Effective Date]"}
      </p>
      <p>
        <strong>Legal Entity:</strong> {legalEntity || "[Legal Entity Name]"}
        <br />
        <strong>Governing Law Jurisdiction:</strong>{" "}
        {governingLaw || "[Governing Law Jurisdiction]"}
        <br />
        <strong>Version:</strong> {version || "unversioned"}
      </p>

      {/* Render canonical markdown content as preformatted text for fidelity without extra client deps */}
      <pre className="whitespace-pre-wrap leading-relaxed text-sm sm:text-base">
        {contentMarkdown || "# Terms unavailable. Please try again later."}
      </pre>
    </main>
  );
}
