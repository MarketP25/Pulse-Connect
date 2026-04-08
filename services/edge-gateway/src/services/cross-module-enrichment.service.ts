import { Injectable } from "@nestjs/common";
import { createHash } from "crypto";
import { ExecuteRequestDto } from "../dto/execute-request.dto";

const CSI_REASON_CODE = "CSI_GATEWAY_ACCESS";
const COORDINATION_VERSION = "pulsco-cross-module-v1";

type ExecuteHeaders = Record<string, string | undefined>;

type CoordinatesSignal = {
  coordinatesAvailable: boolean;
  latitude?: number;
  longitude?: number;
  source: "location" | "coordinates" | "none";
};

@Injectable()
export class CrossModuleEnrichmentService {
  enrichRequest(request: ExecuteRequestDto, headers: ExecuteHeaders = {}): ExecuteRequestDto {
    const context = this.toContextObject(request.context);
    const regionCode = this.resolveRegionCode(request, headers, context);
    const locale = this.resolveLocale(headers, context, regionCode);
    const language = this.extractLanguage(locale);
    const isRtl = this.isRtlLanguage(language);
    const coordinates = this.extractCoordinates(context);
    const placeDistanceKm = this.readNumber(
      this.pickValue(context, [
        "distanceKm",
        "proximityKm",
        "geofenceDistanceKm",
        "location.distanceKm"
      ])
    );
    const placeId = this.readString(this.pickValue(context, ["placeId", "venueId", "location.placeId"]));
    const placeCategory = this.readString(
      this.pickValue(context, ["placeCategory", "venueCategory", "location.category"])
    );
    const placeZone = this.resolvePlaceZone(placeDistanceKm);
    const placeSignalScore = this.resolvePlaceSignalScore({
      coordinatesAvailable: coordinates.coordinatesAvailable,
      placeContextPresent: Boolean(placeId || placeCategory),
      placeDistanceKm,
      placeZone
    });

    const originRegion = this.readString(
      this.pickValue(context, ["originRegion", "userRegion", "sourceRegion"])
    );
    const destinationRegion = this.readString(
      this.pickValue(context, ["destinationRegion", "shippingRegion", "targetRegion"])
    );
    const crossRegion = this.isCrossRegion(originRegion || regionCode, destinationRegion || regionCode);

    const compatibilityScore = this.resolveCompatibilityScore(context);
    const intent = this.resolveIntent(context, request.action);

    const aiRiskAmplifier = this.resolveAiRiskAmplifier({
      crossRegion,
      placeSignalScore,
      compatibilityScore,
      request
    });
    const fraudGuardLevel = this.resolveFraudGuardLevel(aiRiskAmplifier, placeSignalScore, crossRegion);

    const coordinationSeed = JSON.stringify({
      subsystem: request.subsystem,
      action: request.action,
      regionCode,
      locale,
      placeZone,
      placeSignalScore,
      compatibilityScore,
      crossRegion,
      fraudGuardLevel
    });
    const coordinationHash = createHash("sha256").update(coordinationSeed).digest("hex").slice(0, 16);

    const nicheSignals = ["ai", "matchmaking", "localization", "geocoding", "places"];
    const silentSupportTargets = [
      "ecommerce",
      "payments",
      "communication",
      "marketing",
      "fraud",
      "places-venues",
      "matchmaking",
      "proximity-geocoding"
    ];

    const enrichment = {
      version: COORDINATION_VERSION,
      coordinatedGlobalSystem: true,
      reasonCode: CSI_REASON_CODE,
      generatedAt: new Date().toISOString(),
      coordinationHash,
      niches: nicheSignals,
      ai: {
        providerPriority: ["csi", "pulse-intelligence-core"],
        csiReasonCode: CSI_REASON_CODE,
        intent,
        riskAmplifier: aiRiskAmplifier,
        silentSupportEnabled: true
      },
      matchmaking: {
        compatibilityScore,
        crossRegion,
        supportWeight: this.round(Math.max(compatibilityScore, placeSignalScore)),
        silentSupportEnabled: true
      },
      localization: {
        locale,
        language,
        regionCode,
        rtl: isRtl,
        silentSupportEnabled: true
      },
      geocoding: {
        coordinatesAvailable: coordinates.coordinatesAvailable,
        latitude: coordinates.latitude,
        longitude: coordinates.longitude,
        source: coordinates.source,
        placeDistanceKm,
        placeZone,
        silentSupportEnabled: true
      },
      places: {
        placeContextPresent: Boolean(placeId || placeCategory),
        placeCategory: placeCategory || "unspecified",
        zone: placeZone,
        signalScore: placeSignalScore,
        silentSupportEnabled: true
      },
      ecommerce: {
        placeAwareRouting: coordinates.coordinatesAvailable || Boolean(placeId),
        localizedCatalogLanguage: language,
        dynamicPricingZone: this.resolvePricingZone(regionCode, placeZone),
        recommendationWeight: this.round((compatibilityScore + placeSignalScore) / 2),
        fraudGuardLevel
      },
      orchestration: {
        globalReady: true,
        silentSupportTargets,
        crossModuleSignalCount: nicheSignals.length
      }
    };

    return {
      ...request,
      context: {
        ...context,
        crossModule: enrichment
      }
    };
  }

  private toContextObject(value: unknown): Record<string, unknown> {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      return {};
    }
    return value as Record<string, unknown>;
  }

  private pickValue(context: Record<string, unknown>, paths: string[]): unknown {
    for (const path of paths) {
      const value = this.getPathValue(context, path);
      if (value !== undefined && value !== null && value !== "") {
        return value;
      }
    }
    return undefined;
  }

  private getPathValue(context: Record<string, unknown>, path: string): unknown {
    const parts = path.split(".");
    let current: unknown = context;
    for (const part of parts) {
      if (!current || typeof current !== "object" || Array.isArray(current)) {
        return undefined;
      }
      current = (current as Record<string, unknown>)[part];
    }
    return current;
  }

  private readString(value: unknown): string {
    return typeof value === "string" ? value.trim() : "";
  }

  private readNumber(value: unknown): number | undefined {
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }
    if (typeof value === "string") {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
    return undefined;
  }

  private resolveRegionCode(
    request: ExecuteRequestDto,
    headers: ExecuteHeaders,
    context: Record<string, unknown>
  ): string {
    const candidates = [
      this.readString(request.regionCode),
      this.readString(this.pickValue(context, ["regionCode", "location.regionCode"])),
      this.readString(headers["x-region-code"]),
      this.readString(process.env.REGION_CODE)
    ];

    const region = candidates.find((entry) => Boolean(entry)) || "GLOBAL";
    return region.toUpperCase();
  }

  private resolveLocale(
    headers: ExecuteHeaders,
    context: Record<string, unknown>,
    regionCode: string
  ): string {
    const fromContext = this.readString(
      this.pickValue(context, ["locale", "language", "targetLanguage", "preferredLanguage"])
    );
    if (fromContext) {
      return fromContext.replace("_", "-");
    }

    const acceptLanguage = this.readString(headers["accept-language"]);
    if (acceptLanguage) {
      const primary = acceptLanguage.split(",")[0]?.trim();
      if (primary) {
        return primary.replace("_", "-");
      }
    }

    const normalizedRegion = /^[A-Z]{2}$/.test(regionCode) ? regionCode : "US";
    return `en-${normalizedRegion}`;
  }

  private extractLanguage(locale: string): string {
    const first = locale.split("-")[0] || "en";
    return first.toLowerCase();
  }

  private isRtlLanguage(language: string): boolean {
    return ["ar", "fa", "he", "ur"].includes(language);
  }

  private extractCoordinates(context: Record<string, unknown>): CoordinatesSignal {
    const latitude = this.readNumber(this.pickValue(context, ["latitude", "location.latitude"]));
    const longitude = this.readNumber(this.pickValue(context, ["longitude", "location.longitude"]));
    if (latitude !== undefined && longitude !== undefined) {
      return {
        coordinatesAvailable: true,
        latitude: this.round(latitude),
        longitude: this.round(longitude),
        source: this.getPathValue(context, "location.latitude") !== undefined ? "location" : "coordinates"
      };
    }

    return {
      coordinatesAvailable: false,
      source: "none"
    };
  }

  private resolvePlaceZone(distanceKm?: number): "local" | "regional" | "global" | "unknown" {
    if (distanceKm === undefined) {
      return "unknown";
    }
    if (distanceKm <= 25) {
      return "local";
    }
    if (distanceKm <= 500) {
      return "regional";
    }
    return "global";
  }

  private resolvePlaceSignalScore(input: {
    coordinatesAvailable: boolean;
    placeContextPresent: boolean;
    placeDistanceKm?: number;
    placeZone: "local" | "regional" | "global" | "unknown";
  }): number {
    let score = 0.25;
    if (input.coordinatesAvailable) score += 0.25;
    if (input.placeContextPresent) score += 0.2;

    if (input.placeZone === "local") score += 0.25;
    if (input.placeZone === "regional") score += 0.15;
    if (input.placeZone === "global") score += 0.05;

    if (input.placeDistanceKm !== undefined && input.placeDistanceKm > 1000) {
      score -= 0.05;
    }

    return this.round(this.clamp(score, 0, 1));
  }

  private isCrossRegion(originRegion: string, destinationRegion: string): boolean {
    if (!originRegion || !destinationRegion) {
      return false;
    }
    return originRegion.trim().toUpperCase() !== destinationRegion.trim().toUpperCase();
  }

  private resolveCompatibilityScore(context: Record<string, unknown>): number {
    const direct = this.readNumber(
      this.pickValue(context, ["compatibilityScore", "matchScore", "recommendationScore"])
    );
    if (direct !== undefined) {
      const normalized = direct > 1 ? direct / 100 : direct;
      return this.round(this.clamp(normalized, 0, 1));
    }

    const intent = this.readString(this.pickValue(context, ["intent", "matchIntent"])).toLowerCase();
    if (intent.includes("partner") || intent.includes("supplier")) {
      return 0.72;
    }
    if (intent.includes("collab") || intent.includes("match")) {
      return 0.64;
    }
    return 0.5;
  }

  private resolveIntent(context: Record<string, unknown>, fallbackAction: string): string {
    const fromContext = this.readString(this.pickValue(context, ["intent", "matchIntent", "messageIntent"]));
    if (fromContext) {
      return fromContext.slice(0, 64).toLowerCase();
    }
    return fallbackAction.slice(0, 64).toLowerCase();
  }

  private resolveAiRiskAmplifier(input: {
    crossRegion: boolean;
    placeSignalScore: number;
    compatibilityScore: number;
    request: ExecuteRequestDto;
  }): number {
    let amplifier = 0;
    if (input.crossRegion) amplifier += 0.08;
    if (input.request.subsystem === "ecommerce" && input.placeSignalScore < 0.35) amplifier += 0.07;
    if (input.request.subsystem === "payments" && input.compatibilityScore < 0.5) amplifier += 0.06;
    if (input.request.subsystem === "matchmaking" && input.compatibilityScore < 0.45) amplifier += 0.05;
    return this.round(this.clamp(amplifier, 0, 0.3));
  }

  private resolveFraudGuardLevel(
    aiRiskAmplifier: number,
    placeSignalScore: number,
    crossRegion: boolean
  ): "low" | "moderate" | "high" {
    const score = aiRiskAmplifier + (crossRegion ? 0.2 : 0) + (placeSignalScore < 0.3 ? 0.2 : 0);
    if (score >= 0.35) {
      return "high";
    }
    if (score >= 0.18) {
      return "moderate";
    }
    return "low";
  }

  private resolvePricingZone(
    regionCode: string,
    placeZone: "local" | "regional" | "global" | "unknown"
  ): "regional-standard" | "global-adjusted" | "high-regulation" {
    if (["EU", "GB", "CH", "NO"].includes(regionCode)) {
      return "high-regulation";
    }
    if (placeZone === "global") {
      return "global-adjusted";
    }
    return "regional-standard";
  }

  private clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
  }

  private round(value: number): number {
    return Number(value.toFixed(4));
  }
}
