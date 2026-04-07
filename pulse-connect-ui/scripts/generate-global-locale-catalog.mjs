import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const REGISTRY_URL =
  "https://www.iana.org/assignments/language-subtag-registry/language-subtag-registry";
const USER_AGENT =
  "Pulsco-Locale-Catalog-Generator/1.0 (+https://pulsco.global)";

function normalizeName(value = "") {
  return String(value).replace(/\s+/g, " ").trim();
}

function parseRegistry(text) {
  const records = text
    .split("%%")
    .map((entry) => entry.trim())
    .filter(Boolean);

  const languages = [];
  const regions = [];

  for (const record of records) {
    const fields = new Map();
    const lines = record.split(/\r?\n/);

    for (const line of lines) {
      const match = line.match(/^([^:]+):\s*(.*)$/);
      if (!match) {
        continue;
      }

      const key = match[1].trim();
      const value = match[2].trim();
      const existing = fields.get(key) || [];
      existing.push(value);
      fields.set(key, existing);
    }

    const type = fields.get("Type")?.[0];
    const subtag = fields.get("Subtag")?.[0];
    const deprecated = fields.get("Deprecated")?.[0];
    if (!type || !subtag || deprecated) {
      continue;
    }

    const preferredValue = fields.get("Preferred-Value")?.[0];
    const descriptions = fields.get("Description") || [];
    const name = normalizeName(descriptions[0] || preferredValue || subtag);

    if (type === "language") {
      languages.push({
        code: subtag.toLowerCase(),
        name,
      });
      continue;
    }

    if (type === "region") {
      regions.push({
        code: subtag.toUpperCase(),
        name,
      });
    }
  }

  const uniqueByCode = (entries) =>
    Array.from(
      new Map(
        entries.map((entry) => [entry.code, entry]),
      ).values(),
    ).sort((a, b) => a.code.localeCompare(b.code));

  return {
    metadata: {
      source: REGISTRY_URL,
      generatedAt: new Date().toISOString(),
    },
    languages: uniqueByCode(languages),
    regions: uniqueByCode(regions),
  };
}

async function main() {
  const response = await fetch(REGISTRY_URL, {
    headers: {
      "user-agent": USER_AGENT,
    },
  });

  if (!response.ok) {
    throw new Error(`Unable to download registry: ${response.status}`);
  }

  const registryText = await response.text();
  const parsed = parseRegistry(registryText);

  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const outputPath = path.join(__dirname, "..", "src", "config", "global-locale-catalog.json");
  await fs.writeFile(outputPath, JSON.stringify(parsed, null, 2));

   
  console.log(
    `Wrote ${parsed.languages.length} languages and ${parsed.regions.length} regions to ${outputPath}`,
  );
}

main().catch((error) => {
   
  console.error(error);
  process.exit(1);
});
