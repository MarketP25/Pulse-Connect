import { DeliveryDecision, DeliveryRequest, EdgeNode } from "./types";

function normalizeLanguage(value: string): string {
  return value.toLowerCase().split("-")[0];
}

function localizePath(path: string, language: string): string {
  const clean = path.startsWith("/") ? path : `/${path}`;
  if (language === "en") {
    return clean;
  }

  if (clean.startsWith(`/${language}/`)) {
    return clean;
  }

  return `/${language}${clean}`;
}

export class GSODeliveryEngine {
  private readonly edgeNodes: EdgeNode[];

  constructor(edgeNodes: EdgeNode[]) {
    this.edgeNodes = edgeNodes;
  }

  route(request: DeliveryRequest): DeliveryDecision {
    const country = request.country.toUpperCase();
    const preferredLanguages = request.acceptedLanguages.map(normalizeLanguage);

    const countryCandidates = this.edgeNodes.filter((node) =>
      node.countries.map((code) => code.toUpperCase()).includes(country)
    );

    const regionalPool = countryCandidates.length > 0 ? countryCandidates : this.edgeNodes;

    const languageMatch = regionalPool.find((node) =>
      preferredLanguages.some((language) => node.languages.includes(language))
    );

    const chosen =
      languageMatch ??
      [...regionalPool].sort((left, right) => left.medianLatencyMs - right.medianLatencyMs)[0];

    if (!chosen) {
      throw new Error("No edge nodes configured for GSO delivery");
    }

    const selectedLanguage =
      preferredLanguages.find((language) => chosen.languages.includes(language)) ??
      chosen.languages[0] ??
      "en";

    return {
      edgeNodeId: chosen.id,
      region: chosen.region,
      language: selectedLanguage,
      localizedPath: localizePath(request.path, selectedLanguage),
      cacheKey: `${chosen.id}::${selectedLanguage}::${request.path}`
    };
  }
}
