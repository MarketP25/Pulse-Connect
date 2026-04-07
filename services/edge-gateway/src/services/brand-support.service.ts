import { Inject, Injectable, Logger } from "@nestjs/common";
import { createHash, randomUUID } from "crypto";
import type { Pool } from "pg";
import { BrandSupportEventDto, BrandSupportRequestDto } from "../dto/brand-support.dto";
import { TelemetryService } from "./telemetry.service";

const CSI_REASON_CODE = "CSI_GATEWAY_ACCESS";
const DEFAULT_ICON_VERSION = "pulsco-icons-v2026.02";
const BRAND_SUPPORT_SCHEMA = "pulsco-brand-support-v1";
const BRAND_SUPPORT_ENDPOINT = "/edge/brand/support";

type BrandIconAsset = {
  key: string;
  src: string;
  sizes: string;
  type: string;
  usage: "favicon" | "universal" | "maskable" | "branding";
  purpose?: "any" | "maskable" | "any maskable";
};

type ManifestIconAsset = {
  src: string;
  sizes: string;
  type: string;
  purpose?: "any" | "maskable" | "any maskable";
};

type SanitizedSupportEvent = {
  event: string;
  ts: number;
  path?: string;
  meta?: Record<string, string | number | boolean>;
};

type FirewallForwardResult = {
  status:
    | "forwarded"
    | "queued_firewall_missing"
    | "blocked_firewall_invalid"
    | "firewall_denied"
    | "firewall_error";
  forwarded: boolean;
  endpoint?: string;
  detail?: string;
};

type BrandProfile = {
  iconVersion: string;
  themeColor: string;
  backgroundColor: string;
  origins: string[];
};

type BrandConfigInput = {
  sourceApp?: string;
  regionCode?: string;
  headers?: Record<string, string | undefined>;
};

@Injectable()
export class BrandSupportService {
  private readonly logger = new Logger(BrandSupportService.name);

  constructor(
    @Inject("DATABASE_CONNECTION") private readonly db: Pool,
    private readonly telemetryService: TelemetryService
  ) {}

  async getBrandConfig(input: BrandConfigInput) {
    const sourceApp = this.normalizeSourceApp(
      input.sourceApp || input.headers?.["x-pulsco-source-app"]
    );
    const regionCode = this.normalizeRegionCode(
      input.regionCode || input.headers?.["x-region-code"] || process.env.REGION_CODE
    );
    const profile = await this.readActiveBrandProfile();
    const originPool = this.resolveOriginPool(profile, input.headers);
    const selectedOrigin = this.selectOrigin(originPool, sourceApp, regionCode);
    const icons = this.buildIconCatalog().map((icon) => ({
      ...icon,
      src: this.toAbsoluteUrl(selectedOrigin, icon.src)
    }));
    const universalMaskables = this.buildUniversalMaskableAssets(icons);

    const manifestIcons = this.buildManifestIconAssets(icons, universalMaskables);

    await this.storeDistributionEvent({
      requestId: randomUUID(),
      sourceApp,
      regionCode,
      selectedOrigin,
      iconVersion: profile.iconVersion
    });

    return {
      schema: BRAND_SUPPORT_SCHEMA,
      reasonCode: CSI_REASON_CODE,
      brand: "Pulsco",
      iconVersion: profile.iconVersion,
      generatedAt: new Date().toISOString(),
      routing: {
        mode: "planetary_hash_balancing",
        sourceApp,
        regionCode,
        selectedOrigin: selectedOrigin || "local-origin"
      },
      visuals: {
        themeColor: profile.themeColor,
        backgroundColor: profile.backgroundColor
      },
      assets: {
        favicon: this.toAbsoluteUrl(selectedOrigin, "/favicon.ico"),
        universal: icons.filter((icon) => icon.usage === "universal"),
        maskable: icons.filter((icon) => icon.usage === "maskable"),
        universalMaskables,
        branding: icons.filter((icon) => icon.usage === "branding")
      },
      manifest: {
        path: this.toAbsoluteUrl(selectedOrigin, "/manifest.webmanifest"),
        icons: manifestIcons
      },
      support: {
        endpoint: BRAND_SUPPORT_ENDPOINT,
        reasonCode: CSI_REASON_CODE,
        firewallRequired: true
      }
    };
  }

  async getBrandManifest(input: BrandConfigInput) {
    const config = await this.getBrandConfig(input);
    return {
      schema: config.schema,
      iconVersion: config.iconVersion,
      themeColor: config.visuals.themeColor,
      backgroundColor: config.visuals.backgroundColor,
      icons: config.manifest.icons,
      universalMaskables: config.assets.universalMaskables,
      support: config.support
    };
  }

  async ingestBrandSupport(
    body: BrandSupportRequestDto,
    headers: Record<string, string | undefined> = {}
  ) {
    const reasonCode = body.reasonCode || headers["x-csi-reason-code"] || "";
    const sourceApp = this.normalizeSourceApp(body.sourceApp || headers["x-pulsco-source-app"]);
    const regionCode = this.normalizeRegionCode(
      body.regionCode || headers["x-region-code"] || process.env.REGION_CODE
    );
    const requestId = body.requestId || randomUUID();

    if (reasonCode !== CSI_REASON_CODE) {
      return {
        accepted: false,
        requestId,
        storedEvents: 0,
        reasonCode: CSI_REASON_CODE,
        firewall: {
          status: "blocked_firewall_invalid",
          forwarded: false,
          detail: "INVALID_REASON_CODE"
        }
      };
    }

    const events = this.sanitizeSupportEvents(body.events || []);
    if (!events.length) {
      return {
        accepted: false,
        requestId,
        storedEvents: 0,
        reasonCode: CSI_REASON_CODE,
        firewall: {
          status: "blocked_firewall_invalid",
          forwarded: false,
          detail: "NO_VALID_EVENTS"
        }
      };
    }

    await this.storeSupportEvents(requestId, sourceApp, regionCode, events);
    const forwardResult = await this.forwardToCsiThroughFirewall({
      requestId,
      sourceApp,
      regionCode,
      events
    });
    await this.updateSupportEventForwardStatus(requestId, forwardResult.status);

    return {
      accepted: true,
      requestId,
      storedEvents: events.length,
      reasonCode: CSI_REASON_CODE,
      firewall: forwardResult
    };
  }

  private buildIconCatalog(): BrandIconAsset[] {
    return [
      { key: "favicon", src: "/favicon.ico", sizes: "any", type: "image/x-icon", usage: "favicon" },
      {
        key: "icon-16",
        src: "/icons/icon-16x16.png",
        sizes: "16x16",
        type: "image/png",
        usage: "universal"
      },
      {
        key: "icon-32",
        src: "/icons/icon-32x32.png",
        sizes: "32x32",
        type: "image/png",
        usage: "universal"
      },
      {
        key: "icon-152",
        src: "/icons/icon-152x152.jpeg",
        sizes: "152x152",
        type: "image/jpeg",
        usage: "universal"
      },
      {
        key: "icon-192",
        src: "/icons/icon-192x192.jpeg",
        sizes: "192x192",
        type: "image/jpeg",
        usage: "universal"
      },
      {
        key: "icon-512",
        src: "/icons/icon-512x512.jpeg",
        sizes: "512x512",
        type: "image/jpeg",
        usage: "universal"
      },
      {
        key: "icon-152-maskable",
        src: "/icons/icon-152x152-maskable.jpeg",
        sizes: "152x152",
        type: "image/jpeg",
        usage: "maskable",
        purpose: "maskable"
      },
      {
        key: "icon-512-maskable",
        src: "/icons/icon-512x512-maskable.jpeg",
        sizes: "512x512",
        type: "image/jpeg",
        usage: "maskable",
        purpose: "maskable"
      },
      {
        key: "brand-1024",
        src: "/icons/brand-1024x1024.jpeg",
        sizes: "1024x1024",
        type: "image/jpeg",
        usage: "branding"
      }
    ];
  }

  private buildUniversalMaskableAssets(icons: BrandIconAsset[]): ManifestIconAsset[] {
    const candidates = icons.filter(
      (icon) =>
        icon.usage === "maskable" ||
        (icon.usage === "universal" && (icon.sizes === "152x152" || icon.sizes === "512x512"))
    );

    return candidates.map((icon) => ({
      src: icon.src,
      sizes: icon.sizes,
      type: icon.type,
      purpose: "any maskable"
    }));
  }

  private buildManifestIconAssets(
    icons: BrandIconAsset[],
    universalMaskables: ManifestIconAsset[]
  ) {
    const combined: ManifestIconAsset[] = [
      ...icons
        .filter((icon) => icon.usage !== "branding")
        .map(({ src, sizes, type, purpose }) => ({
          src,
          sizes,
          type,
          ...(purpose ? { purpose } : {})
        })),
      ...universalMaskables
    ];

    const seen = new Set<string>();
    const deduped: ManifestIconAsset[] = [];
    for (const icon of combined) {
      const key = `${icon.src}|${icon.sizes}|${icon.type}|${icon.purpose || ""}`;
      if (seen.has(key)) continue;
      seen.add(key);
      deduped.push(icon);
    }

    return deduped;
  }

  private sanitizeSupportEvents(events: BrandSupportEventDto[]): SanitizedSupportEvent[] {
    const sanitized: SanitizedSupportEvent[] = [];
    for (const event of events) {
      const eventName = typeof event.event === "string" ? event.event.trim().slice(0, 64) : "";
      if (!eventName) continue;

      const ts = Number.isFinite(event.ts) && event.ts > 0 ? Math.floor(event.ts) : Date.now();
      const path =
        typeof event.path === "string" && event.path.trim()
          ? event.path.trim().slice(0, 256).split("?")[0]
          : undefined;
      const meta = this.sanitizeMeta(event.meta);

      sanitized.push({
        event: eventName,
        ts,
        ...(path ? { path } : {}),
        ...(meta ? { meta } : {})
      });
    }

    return sanitized.slice(0, 100);
  }

  private sanitizeMeta(meta: unknown): Record<string, string | number | boolean> | undefined {
    if (!meta || typeof meta !== "object" || Array.isArray(meta)) return undefined;
    const forbiddenKey =
      /(token|cookie|password|secret|authorization|wallet|billing|admin|edge|marp)/i;
    const clean: Record<string, string | number | boolean> = {};

    for (const [key, value] of Object.entries(meta).slice(0, 12)) {
      if (forbiddenKey.test(key)) continue;
      if (typeof value === "string") clean[key] = value.slice(0, 128);
      else if (typeof value === "number" && Number.isFinite(value)) clean[key] = value;
      else if (typeof value === "boolean") clean[key] = value;
    }

    return Object.keys(clean).length ? clean : undefined;
  }

  private normalizeSourceApp(value?: string) {
    return value?.trim().slice(0, 255) || "unknown";
  }

  private normalizeRegionCode(value?: string) {
    return value?.trim().slice(0, 64) || "GLOBAL";
  }

  private toAbsoluteUrl(origin: string, path: string) {
    if (!origin) return path;
    const cleanOrigin = origin.replace(/\/+$/, "");
    const cleanPath = path.startsWith("/") ? path : `/${path}`;
    return `${cleanOrigin}${cleanPath}`;
  }

  private selectOrigin(origins: string[], sourceApp: string, regionCode: string) {
    if (!origins.length) return "";
    const hash = createHash("sha256").update(`${sourceApp}|${regionCode}`).digest("hex");
    const slot = Number.parseInt(hash.slice(0, 8), 16) % origins.length;
    return origins[slot] || "";
  }

  private resolveOriginPool(profile: BrandProfile, headers?: Record<string, string | undefined>) {
    const envOrigins = (process.env.PULSCO_BRAND_ICON_ORIGINS || "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);

    const requestOrigin = this.extractRequestOrigin(headers);
    const candidates = [
      ...envOrigins,
      ...profile.origins,
      ...(requestOrigin ? [requestOrigin] : []),
      ""
    ];
    const seen = new Set<string>();
    const deduped: string[] = [];

    for (const candidate of candidates) {
      const normalized = this.normalizeOrigin(candidate);
      if (seen.has(normalized)) continue;
      seen.add(normalized);
      deduped.push(normalized);
    }

    return deduped;
  }

  private extractRequestOrigin(headers?: Record<string, string | undefined>) {
    if (!headers) return "";

    const forwardedProto = headers["x-forwarded-proto"]?.split(",")[0]?.trim();
    const forwardedHost = headers["x-forwarded-host"]?.split(",")[0]?.trim();
    const host = forwardedHost || headers.host?.split(",")[0]?.trim();

    if (!host) return "";
    const protocol = forwardedProto || "https";
    return this.normalizeOrigin(`${protocol}://${host}`);
  }

  private normalizeOrigin(value: string) {
    if (!value) return "";
    try {
      const parsed = new URL(value);
      parsed.hash = "";
      parsed.search = "";
      return parsed.toString().replace(/\/+$/, "");
    } catch {
      return "";
    }
  }

  private async readActiveBrandProfile(): Promise<BrandProfile> {
    const fallback: BrandProfile = {
      iconVersion: DEFAULT_ICON_VERSION,
      themeColor: "#7c3aed",
      backgroundColor: "#0f172a",
      origins: []
    };

    const query = `
      SELECT version, config_json
      FROM edge_brand_profiles
      WHERE is_active = true
      ORDER BY updated_at DESC
      LIMIT 1
    `;

    try {
      const result = await this.db.query(query);
      const row = result.rows?.[0];
      if (!row) return fallback;

      const raw = row.config_json && typeof row.config_json === "object" ? row.config_json : {};
      const config = raw as Record<string, unknown>;
      const origins = Array.isArray(config.origins)
        ? config.origins.filter((entry): entry is string => typeof entry === "string")
        : [];

      return {
        iconVersion: typeof row.version === "string" ? row.version : fallback.iconVersion,
        themeColor: typeof config.themeColor === "string" ? config.themeColor : fallback.themeColor,
        backgroundColor:
          typeof config.backgroundColor === "string"
            ? config.backgroundColor
            : fallback.backgroundColor,
        origins
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Brand profile table unavailable; using fallback (${message})`);
      return fallback;
    }
  }

  private async storeDistributionEvent(input: {
    requestId: string;
    sourceApp: string;
    regionCode: string;
    selectedOrigin: string;
    iconVersion: string;
  }) {
    const query = `
      INSERT INTO edge_brand_distribution_events (
        request_id,
        source_app,
        region_code,
        selected_origin,
        icon_version,
        served_via_firewall,
        created_at
      ) VALUES ($1, $2, $3, $4, $5, true, NOW())
    `;

    try {
      await this.db.query(query, [
        input.requestId,
        input.sourceApp,
        input.regionCode,
        input.selectedOrigin || null,
        input.iconVersion
      ]);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Distribution event persistence skipped (${message})`);
    }
  }

  private async storeSupportEvents(
    requestId: string,
    sourceApp: string,
    regionCode: string,
    events: SanitizedSupportEvent[]
  ) {
    const query = `
      INSERT INTO edge_brand_support_events (
        request_id,
        source_app,
        region_code,
        event_name,
        event_ts,
        event_path,
        event_meta,
        reason_code,
        firewall_status,
        created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'queued', NOW())
    `;

    try {
      for (const event of events) {
        await this.db.query(query, [
          requestId,
          sourceApp,
          regionCode,
          event.event,
          new Date(event.ts).toISOString(),
          event.path || null,
          JSON.stringify(event.meta || {}),
          CSI_REASON_CODE
        ]);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Support event persistence skipped (${message})`);
    }
  }

  private async updateSupportEventForwardStatus(
    requestId: string,
    status: FirewallForwardResult["status"]
  ) {
    const query = `
      UPDATE edge_brand_support_events
      SET firewall_status = $1
      WHERE request_id = $2
    `;

    try {
      await this.db.query(query, [status, requestId]);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Support event status update skipped (${message})`);
    }
  }

  private async forwardToCsiThroughFirewall(input: {
    requestId: string;
    sourceApp: string;
    regionCode: string;
    events: SanitizedSupportEvent[];
  }): Promise<FirewallForwardResult> {
    const firewallUrl = this.resolveFirewallUrl();
    if (!firewallUrl) {
      return {
        status: "queued_firewall_missing",
        forwarded: false,
        detail: "MARP firewall URL is not configured or is invalid"
      };
    }

    try {
      const response = await fetch(firewallUrl, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "cache-control": "no-store",
          "x-csi-reason-code": CSI_REASON_CODE,
          "x-pulsco-source-app": input.sourceApp
        },
        body: JSON.stringify({
          subsystemName: "edge-brand-support",
          action: "route-support-telemetry",
          payload: {
            source: "pulsco-edge-gateway",
            destination: "support-intelligence",
            requestId: input.requestId,
            eventCount: input.events.length,
            schema: BRAND_SUPPORT_SCHEMA
          },
          context: {
            source: "pulsco",
            destination: "edge",
            sourceApp: input.sourceApp,
            regionCode: input.regionCode
          }
        })
      });

      if (!response.ok) {
        return {
          status: "firewall_error",
          forwarded: false,
          endpoint: firewallUrl,
          detail: `Firewall response ${response.status}`
        };
      }

      const raw = await response.text();
      let parsed: Record<string, unknown> | null = null;
      try {
        parsed = raw ? (JSON.parse(raw) as Record<string, unknown>) : null;
      } catch {
        parsed = null;
      }

      if (parsed && parsed.allowed === false) {
        return {
          status: "firewall_denied",
          forwarded: false,
          endpoint: firewallUrl,
          detail:
            typeof parsed.riskAssessment === "string"
              ? parsed.riskAssessment
              : "Firewall denied request"
        };
      }

      return {
        status: "forwarded",
        forwarded: true,
        endpoint: firewallUrl
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await this.telemetryService.sendAnomaly({
        anomalyType: "brand_support_firewall_forward_failed",
        severity: "medium",
        requestId: input.requestId,
        subsystem: "edge-brand-support",
        description: message,
        context: {
          sourceApp: input.sourceApp,
          regionCode: input.regionCode,
          reasonCode: CSI_REASON_CODE,
          firewallUrl
        },
        timestamp: new Date().toISOString()
      });

      return {
        status: "firewall_error",
        forwarded: false,
        endpoint: firewallUrl,
        detail: message
      };
    }
  }

  private resolveFirewallUrl() {
    const raw =
      process.env.PULSCO_MARP_FIREWALL_URL ||
      process.env.MARP_FIREWALL_GATEWAY_URL ||
      process.env.PULSCO_CSI_FIREWALL_URL ||
      "";

    if (!raw) return "";
    const normalized = this.normalizeFirewallUrl(raw);
    if (!normalized) return "";
    return normalized;
  }

  private normalizeFirewallUrl(raw: string) {
    let parsed: URL;
    try {
      parsed = new URL(raw);
    } catch {
      return "";
    }

    const isDirectCsi = this.looksLikeDirectCsiUrl(parsed);
    const isFirewall = this.looksLikeFirewallUrl(parsed);
    if (isDirectCsi || !isFirewall) return "";

    if (!parsed.pathname || parsed.pathname === "/") {
      parsed.pathname = "/marp/enforcement/enforce";
    }

    parsed.hash = "";
    parsed.search = "";
    return parsed.toString();
  }

  private looksLikeDirectCsiUrl(url: URL) {
    const joined = `${url.hostname}${url.pathname}`.toLowerCase();
    return /(^|[.-])csi([.-]|$)/.test(url.hostname.toLowerCase()) || /\/csi(\/|$)/.test(joined);
  }

  private looksLikeFirewallUrl(url: URL) {
    const joined = `${url.hostname}${url.pathname}`.toLowerCase();
    return /firewall|marp/.test(joined);
  }
}
