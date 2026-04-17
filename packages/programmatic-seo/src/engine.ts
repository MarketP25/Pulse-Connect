import { ProgrammaticGenerationResult, ProgrammaticPage, ProgrammaticSEOInput } from "./types";

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function dedupeKey(parts: string[]): string {
  return parts.map((part) => part.toLowerCase().trim()).join("::");
}

export class ProgrammaticSEOEngine {
  generate(input: ProgrammaticSEOInput): ProgrammaticGenerationResult {
    const pages: ProgrammaticPage[] = [];
    const seen = new Set<string>();
    let duplicatesPrevented = 0;

    for (const profile of input.cities) {
      if (!profile.city) {
        continue;
      }

      const key = dedupeKey(["city", profile.city, profile.country, profile.language]);
      if (seen.has(key)) {
        duplicatesPrevented += 1;
        continue;
      }

      seen.add(key);

      pages.push({
        path: `/pulsco-in-${slugify(profile.city)}`,
        template: "city_presence",
        language: profile.language,
        city: profile.city,
        country: profile.country,
        localData: {
          demandScore: profile.demandScore,
          searchTheme: profile.searchTheme,
          notableEntity: profile.notableEntity
        },
        valueStatement: `Local service intelligence for ${profile.city}, ${profile.country}.`,
        schemaRequirements: ["organization", "localBusiness", "faq"],
        dedupeKey: key
      });
    }

    for (const profile of input.countries) {
      const key = dedupeKey(["country", profile.country, profile.language]);
      if (seen.has(key)) {
        duplicatesPrevented += 1;
        continue;
      }

      seen.add(key);

      pages.push({
        path: `/services-in-${slugify(profile.country)}`,
        template: "country_services",
        language: profile.language,
        country: profile.country,
        localData: {
          demandScore: profile.demandScore,
          searchTheme: profile.searchTheme,
          notableEntity: profile.notableEntity
        },
        valueStatement: `Country-level discovery strategy for ${profile.country} with multi-service coverage.`,
        schemaRequirements: ["organization", "faq", "product"],
        dedupeKey: key
      });
    }

    for (const service of input.services) {
      const key = dedupeKey(["near-me", service]);
      if (seen.has(key)) {
        duplicatesPrevented += 1;
        continue;
      }

      seen.add(key);

      pages.push({
        path: `/best-${slugify(service)}-near-me`,
        template: "service_near_me",
        language: "en",
        service,
        country: "global",
        localData: {
          demandScore: 0.7,
          searchTheme: `${service} near me`,
          notableEntity: "Pulsco Global Ltd"
        },
        valueStatement: `Intent-focused near-me guidance for ${service}.`,
        schemaRequirements: ["organization", "faq", "review"],
        dedupeKey: key
      });
    }

    return {
      pages,
      duplicatesPrevented
    };
  }
}
