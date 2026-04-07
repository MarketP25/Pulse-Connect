import { Injectable, Logger } from "@nestjs/common";

export interface GeoRoutingRequest {
  sourceLanguage: string;
  targetLanguage: string;
  userLocation?: {
    country: string;
    region?: string;
    city?: string;
  };
  contentType: "text" | "speech" | "video" | "sign";
  quality: "fast" | "standard" | "premium";
}

export interface GeoRoutingResult {
  optimalRegion: string;
  provider: string;
  estimatedLatency: number;
  estimatedCost: number;
  dataLocality: "local" | "regional" | "global";
  compliance: {
    gdprCompliant: boolean;
    ccpaCompliant: boolean;
    dataResidency: string[];
  };
  alternatives: Array<{
    region: string;
    provider: string;
    latency: number;
    cost: number;
    score: number;
  }>;
}

@Injectable()
export class GeoRouterService {
  private readonly logger = new Logger(GeoRouterService.name);

  // Planetary region configuration for PULSCO
  private planetaryRegions = {
    africa: {
      countries: ["KE", "ZA", "NG", "EG", "MA", "GH", "TZ", "UG", "SN", "CI", "CM", "ET"],
      providers: ["pulse_internal"],
      dataCenters: ["africa-south1", "africa-central1"],
      latencyBaseline: 150,
      compliance: ["gdpr", "popia", "data_protection_africa"],
      languages: ["sw", "am", "yo", "ha", "zu", "xh", "af", "ar"]
    },
    us: {
      countries: ["US", "CA", "MX"],
      providers: ["pulse_internal"],
      dataCenters: ["us-central1", "us-east1", "us-west2"],
      latencyBaseline: 20,
      compliance: ["ccpa", "gdpr"],
      languages: ["en", "es", "fr"]
    },
    eu: {
      countries: ["GB", "DE", "FR", "IT", "ES", "NL", "SE", "NO", "DK", "FI", "PL", "CZ"],
      providers: ["pulse_internal"],
      dataCenters: ["europe-west1", "europe-west2", "europe-north1"],
      latencyBaseline: 25,
      compliance: ["gdpr", "dsgvo"],
      languages: ["en", "de", "fr", "it", "es", "nl", "sv", "da", "no", "fi", "pl", "cs"]
    },
    asia: {
      countries: [
        "JP",
        "KR",
        "CN",
        "IN",
        "SG",
        "AU",
        "NZ",
        "TH",
        "MY",
        "ID",
        "PH",
        "VN",
        "HK",
        "TW"
      ],
      providers: ["pulse_internal"],
      dataCenters: ["asia-east1", "asia-southeast1", "asia-northeast1"],
      latencyBaseline: 120,
      compliance: ["pdpa", "pipeda", "privacy_act_australia"],
      languages: ["ja", "ko", "zh", "hi", "en", "th", "ms", "id", "vi", "tl"]
    },
    south_america: {
      countries: ["BR", "AR", "CL", "CO", "PE", "VE", "EC", "UY", "PY", "BO"],
      providers: ["pulse_internal"],
      dataCenters: ["southamerica-east1"],
      latencyBaseline: 180,
      compliance: ["lgpd", "pdp"],
      languages: ["pt", "es", "qu", "gn"]
    },
    middle_east: {
      countries: ["SA", "AE", "QA", "KW", "BH", "OM", "JO", "LB", "IQ", "IR"],
      providers: ["pulse_internal"],
      dataCenters: ["me-central1"],
      latencyBaseline: 200,
      compliance: ["pdpl", "federal_decree_uae"],
      languages: ["ar", "fa", "he", "tr"]
    }
  };

  // Language-to-region mapping for planetary optimization
  private languageRegionMapping = {
    // African languages - prioritize African regions
    sw: ["africa"],
    am: ["africa"],
    yo: ["africa"],
    ha: ["africa"],
    zu: ["africa"],
    xh: ["africa"],
    af: ["africa"],

    // European languages - EU regions
    en: ["us", "eu", "asia"],
    de: ["eu"],
    fr: ["eu", "us"],
    it: ["eu"],
    es: ["eu", "us", "south_america"],
    pt: ["eu", "south_america"],
    nl: ["eu"],
    sv: ["eu"],
    da: ["eu"],
    no: ["eu"],
    fi: ["eu"],
    pl: ["eu"],
    cs: ["eu"],

    // Asian languages - Asia regions
    ja: ["asia"],
    ko: ["asia"],
    zh: ["asia"],
    hi: ["asia"],
    th: ["asia"],
    ms: ["asia"],
    id: ["asia"],
    vi: ["asia"],
    tl: ["asia"],

    // Middle Eastern languages
    ar: ["middle_east", "africa", "asia"],
    fa: ["middle_east"],
    he: ["middle_east"],
    tr: ["eu", "middle_east"],

    // Sign languages - global but region-specific models
    asl: ["us"],
    bsl: ["eu"],
    ksl: ["africa"],
    isl: ["eu", "us", "asia"],

    // Indigenous languages
    qu: ["south_america"],
    gn: ["south_america"],
    nah: ["us"],
    zap: ["us"]
  };

  /**
   * Get optimal planetary region for translation request
   */
  async getOptimalRegion(
    sourceLanguage: string,
    targetLanguage: string,
    userLocation?: { country: string; region?: string }
  ): Promise<string> {
    const request: GeoRoutingRequest = {
      sourceLanguage,
      targetLanguage,
      userLocation,
      contentType: "text",
      quality: "standard"
    };

    const result = await this.routeRequest(request);
    return result.optimalRegion;
  }

  /**
   * Route translation request to optimal planetary region
   */
  async routeRequest(request: GeoRoutingRequest): Promise<GeoRoutingResult> {
    const candidates = this.generateCandidates(request);
    const scored = await this.scoreCandidates(candidates, request);
    const optimal = this.selectOptimal(scored);

    return {
      optimalRegion: optimal.region,
      provider: optimal.provider,
      estimatedLatency: optimal.latency,
      estimatedCost: optimal.cost,
      dataLocality: this.determineDataLocality(optimal.region, request.userLocation?.country),
      compliance: this.checkCompliance(optimal.region, request.userLocation?.country),
      alternatives: scored.slice(1, 4) // Top 3 alternatives
    };
  }

  /**
   * Get real-time planetary region health and capacity
   */
  async getRegionHealth(): Promise<
    Record<
      string,
      {
        status: "healthy" | "degraded" | "unhealthy";
        latency: number;
        capacity: number; // 0-100
        activeConnections: number;
        modelVersions: Record<string, string>;
      }
    >
  > {
    // Planetary health monitoring - in real implementation, this would monitor actual infrastructure
    return {
      "africa-south1": {
        status: "healthy",
        latency: 180,
        capacity: 75,
        activeConnections: 1250,
        modelVersions: { nmt: "v3.0", asr: "v2.8", tts: "v2.9" }
      },
      "us-central1": {
        status: "healthy",
        latency: 15,
        capacity: 60,
        activeConnections: 5200,
        modelVersions: { nmt: "v3.0", asr: "v2.8", tts: "v2.9" }
      },
      "europe-west1": {
        status: "healthy",
        latency: 22,
        capacity: 80,
        activeConnections: 3800,
        modelVersions: { nmt: "v3.0", asr: "v2.8", tts: "v2.9" }
      },
      "asia-east1": {
        status: "degraded",
        latency: 140,
        capacity: 45,
        activeConnections: 2900,
        modelVersions: { nmt: "v2.9", asr: "v2.7", tts: "v2.8" }
      },
      "southamerica-east1": {
        status: "healthy",
        latency: 200,
        capacity: 85,
        activeConnections: 950,
        modelVersions: { nmt: "v3.0", asr: "v2.8", tts: "v2.9" }
      },
      "me-central1": {
        status: "healthy",
        latency: 220,
        capacity: 70,
        activeConnections: 680,
        modelVersions: { nmt: "v3.0", asr: "v2.8", tts: "v2.9" }
      }
    };
  }

  /**
   * Get planetary data transfer costs and compliance info
   */
  async getDataTransferCosts(): Promise<{
    intraRegional: number; // Cost per GB within region
    interRegional: number; // Cost per GB between regions
    global: number; // Cost per GB global transfer
    compliance: Record<string, string[]>;
  }> {
    return {
      intraRegional: 0.01, // $0.01 per GB within region (very low for PULSCO)
      interRegional: 0.05, // $0.05 per GB between regions
      global: 0.12, // $0.12 per GB global transfer
      compliance: {
        gdpr: ["eu", "us", "asia"],
        ccpa: ["us"],
        lgpd: ["south_america"],
        pdpa: ["asia"],
        popia: ["africa"]
      }
    };
  }

  /**
   * Get planetary language coverage and model availability
   */
  getLanguageCoverage(): Record<
    string,
    {
      regions: string[];
      modelQuality: "high" | "medium" | "low";
      lastUpdated: string;
      speakerCount: number;
    }
  > {
    return {
      en: {
        regions: ["us", "eu", "asia"],
        modelQuality: "high",
        lastUpdated: "2024-01-15",
        speakerCount: 1500000000
      },
      es: {
        regions: ["us", "eu", "south_america"],
        modelQuality: "high",
        lastUpdated: "2024-01-15",
        speakerCount: 500000000
      },
      fr: {
        regions: ["eu", "us"],
        modelQuality: "high",
        lastUpdated: "2024-01-15",
        speakerCount: 300000000
      },
      de: {
        regions: ["eu"],
        modelQuality: "high",
        lastUpdated: "2024-01-15",
        speakerCount: 100000000
      },
      sw: {
        regions: ["africa"],
        modelQuality: "high",
        lastUpdated: "2024-01-15",
        speakerCount: 20000000
      },
      am: {
        regions: ["africa"],
        modelQuality: "medium",
        lastUpdated: "2024-01-10",
        speakerCount: 35000000
      },
      ar: {
        regions: ["middle_east", "africa", "asia"],
        modelQuality: "high",
        lastUpdated: "2024-01-15",
        speakerCount: 300000000
      },
      zh: {
        regions: ["asia"],
        modelQuality: "high",
        lastUpdated: "2024-01-15",
        speakerCount: 1200000000
      },
      hi: {
        regions: ["asia"],
        modelQuality: "high",
        lastUpdated: "2024-01-15",
        speakerCount: 400000000
      },
      asl: {
        regions: ["us"],
        modelQuality: "medium",
        lastUpdated: "2024-01-12",
        speakerCount: 500000
      },
      bsl: {
        regions: ["eu"],
        modelQuality: "medium",
        lastUpdated: "2024-01-12",
        speakerCount: 150000
      },
      ksl: {
        regions: ["africa"],
        modelQuality: "low",
        lastUpdated: "2024-01-08",
        speakerCount: 100000
      }
    };
  }

  // Private helper methods

  private generateCandidates(request: GeoRoutingRequest): Array<{
    region: string;
    provider: string;
    baseLatency: number;
  }> {
    const candidates: Array<{ region: string; provider: string; baseLatency: number }> = [];

    // Get preferred regions based on languages
    const sourceRegions = this.languageRegionMapping[
      request.sourceLanguage as keyof typeof this.languageRegionMapping
    ] || ["us"];
    const targetRegions = this.languageRegionMapping[
      request.targetLanguage as keyof typeof this.languageRegionMapping
    ] || ["us"];

    // Combine and deduplicate regions
    const candidateRegions = [...new Set([...sourceRegions, ...targetRegions])];

    for (const regionName of candidateRegions) {
      const region = this.planetaryRegions[regionName as keyof typeof this.planetaryRegions];
      if (region) {
        candidates.push({
          region: regionName,
          provider: "pulse_internal",
          baseLatency: region.latencyBaseline
        });
      }
    }

    return candidates;
  }

  private async scoreCandidates(
    candidates: Array<{ region: string; provider: string; baseLatency: number }>,
    request: GeoRoutingRequest
  ): Promise<
    Array<{
      region: string;
      provider: string;
      latency: number;
      cost: number;
      score: number;
    }>
  > {
    const scored = [];

    for (const candidate of candidates) {
      const region = this.planetaryRegions[candidate.region as keyof typeof this.planetaryRegions];

      // Calculate latency (considering user location)
      let latency = candidate.baseLatency;
      if (request.userLocation?.country) {
        const userRegion = this.getRegionForCountry(request.userLocation.country);
        if (userRegion === candidate.region) {
          latency *= 0.7; // 30% reduction for local region
        } else if (this.areRegionsAdjacent(userRegion, candidate.region)) {
          latency *= 0.85; // 15% reduction for adjacent regions
        }
      }

      // Calculate cost based on quality and region
      const qualityMultiplier = { fast: 1.2, standard: 1.0, premium: 0.8 }[request.quality];
      const cost = latency * 0.001 * qualityMultiplier; // Mock cost calculation

      // Calculate overall score (lower latency + lower cost = higher score)
      const score = 1000 / (latency + cost * 100);

      scored.push({
        region: candidate.region,
        provider: candidate.provider,
        latency,
        cost,
        score
      });
    }

    // Sort by score descending
    return scored.sort((a, b) => b.score - a.score);
  }

  private selectOptimal(
    scoredCandidates: Array<{
      region: string;
      provider: string;
      latency: number;
      cost: number;
      score: number;
    }>
  ): {
    region: string;
    provider: string;
    latency: number;
    cost: number;
  } {
    return scoredCandidates[0];
  }

  private determineDataLocality(
    region: string,
    userCountry?: string
  ): "local" | "regional" | "global" {
    if (!userCountry) return "regional";

    const userRegion = this.getRegionForCountry(userCountry);
    if (userRegion === region) return "local";
    if (this.areRegionsAdjacent(userRegion, region)) return "regional";
    return "global";
  }

  private checkCompliance(
    region: string,
    userCountry?: string
  ): {
    gdprCompliant: boolean;
    ccpaCompliant: boolean;
    dataResidency: string[];
  } {
    const regionConfig = this.planetaryRegions[region as keyof typeof this.planetaryRegions];

    return {
      gdprCompliant: regionConfig.compliance.includes("gdpr"),
      ccpaCompliant: regionConfig.compliance.includes("ccpa"),
      dataResidency: regionConfig.compliance
    };
  }

  private getRegionForCountry(country: string): string {
    for (const [regionName, region] of Object.entries(this.planetaryRegions)) {
      if (region.countries.includes(country)) {
        return regionName;
      }
    }
    return "us"; // Default fallback
  }

  private areRegionsAdjacent(region1: string, region2: string): boolean {
    const adjacentRegions: Record<string, string[]> = {
      africa: ["eu", "middle_east"],
      eu: ["africa", "us", "middle_east"],
      us: ["eu", "south_america"],
      south_america: ["us"],
      asia: ["middle_east"],
      middle_east: ["africa", "eu", "asia"]
    };

    return adjacentRegions[region1]?.includes(region2) || false;
  }
}
