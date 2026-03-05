import React from "react";

export const metadata = {
  title: "Legal | Pulsco",
};

type LegalDoc = {
  id: string;
  title: string;
  endpoint: string;
  anchor: string;
};

const DOCS: LegalDoc[] = [
  { id: "terms", title: "Terms of Service", endpoint: "terms", anchor: "terms-of-service" },
  { id: "privacy", title: "Privacy Policy", endpoint: "privacy", anchor: "privacy-policy" },
  { id: "aup", title: "Acceptable Use Policy", endpoint: "aup", anchor: "acceptable-use-policy" },
  { id: "marketplace-seller", title: "Marketplace Seller Agreement", endpoint: "marketplace-seller", anchor: "marketplace-seller-agreement" },
  { id: "ai-disclosure", title: "AI & Automation Disclosure", endpoint: "ai-disclosure", anchor: "ai-automation-disclosure" },
  { id: "governance-charter", title: "Platform Governance & Enforcement Charter", endpoint: "governance-charter", anchor: "platform-governance-charter" },
  { id: "compliance-disclaimer", title: "Global Compliance Disclaimer", endpoint: "compliance-disclaimer", anchor: "global-compliance-disclaimer" },
];

async function fetchFromCandidates(paths: string[]) {
  let lastError: unknown = null;
  for (const url of paths) {
    try {
      const res = await fetch(url, { cache: 'no-store' });
      if (res.ok) return res.json();
      lastError = new Error(`HTTP ${res.status}`);
    } catch (err) {
      lastError = err;
      continue;
    }
  }
  throw lastError ?? new Error('Unable to fetch legal document');
}

async function fetchDoc(endpoint: string) {
  const roots: string[] = [];
  if (process.env.EDGE_GATEWAY_URL) roots.push(process.env.EDGE_GATEWAY_URL.replace(/\/$/, ''));
  if (process.env.NEXT_PUBLIC_EDGE_GATEWAY_URL) roots.push(process.env.NEXT_PUBLIC_EDGE_GATEWAY_URL.replace(/\/$/, ''));
  // Unified origin fallback (Nginx proxies /edge/* to edge-gateway)
  roots.push('/edge');

  const candidates = roots.map((r) => `${r}/legal/${endpoint}`);
  return fetchFromCandidates(candidates);
}

export default async function LegalCenterPage() {
  // Fetch all docs in parallel
  const results = await Promise.all(
    DOCS.map(async (d) => {
      try {
        const data = await fetchDoc(d.endpoint);
        return { ...d, ok: true, data } as const;
      } catch (err) {
        return { ...d, ok: false, error: String(err) } as const;
      }
    })
  );

  return (
    <main className="mx-auto max-w-5xl px-4 py-12 prose prose-invert">
      <h1>Pulsco Legal Center</h1>
      <p className="text-sm opacity-80">Unified access to Pulsco's public legal documents.</p>

      <h2>Table of Contents</h2>
      <ul>
        {results.map((r) => (
          <li key={r.id}>
            <a href={`#${r.anchor}`}>{r.title}</a>
            {r.ok && r.data?.version ? (
              <span className="ml-2 text-xs opacity-60">(v{r.data.version})</span>
            ) : null}
          </li>
        ))}
      </ul>

      {results.map((r) => (
        <section key={r.id} id={r.anchor}>
          <h2>{r.title}</h2>
          {r.ok ? (
            <>
              <div className="text-xs opacity-70 mb-2">
                {r.data?.effectiveDate ? (
                  <span className="mr-4"><strong>Effective Date:</strong> {r.data.effectiveDate}</span>
                ) : null}
                {r.data?.legalEntity ? (
                  <span className="mr-4"><strong>Entity:</strong> {r.data.legalEntity}</span>
                ) : null}
                {r.data?.governingLaw ? (
                  <span className="mr-4"><strong>Law:</strong> {r.data.governingLaw}</span>
                ) : null}
                {r.data?.version ? (
                  <span className="mr-4"><strong>Version:</strong> {r.data.version}</span>
                ) : null}
              </div>
              <pre className="whitespace-pre-wrap leading-relaxed text-sm sm:text-base">{r.data?.contentMarkdown || `# ${r.title} unavailable.`}</pre>
            </>
          ) : (
            <div className="text-red-400 text-sm">Failed to load: {r.error}</div>
          )}
        </section>
      ))}
    </main>
  );
}
