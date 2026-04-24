export interface AppConfig {
  port: number;
  host: string;
  internalToken?: string;
  redisUrl?: string;
  redisKeyPrefix: string;
  cycleLockTtlMs: number;
  autoCycleEnabled: boolean;
  cycleIntervalMs: number;
  cycleStartupJitterMs: number;
  cycleActorId: string;
  stateFilePath: string;
  historyLimit: number;
  feedTimeoutMs: number;
  feedEndpoints: {
    trendsUrl?: string;
    csiEventsUrl?: string;
    programmaticUrl?: string;
    performanceUrl?: string;
    refreshUrl?: string;
    deliveryUrl?: string;
    gsoRouteUrl?: string;
  };
}

function parseNumber(value: string | undefined, fallback: number): number {
  if (!value) {
    return fallback;
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }

  return parsed;
}

function parseBoolean(value: string | undefined, fallback: boolean): boolean {
  if (!value) {
    return fallback;
  }

  const normalized = value.trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized)) {
    return true;
  }

  if (["0", "false", "no", "off"].includes(normalized)) {
    return false;
  }

  return fallback;
}

function parseString(value: string | undefined): string | undefined {
  if (!value) {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const intervalMs = parseNumber(env.SEO_CYCLE_INTERVAL_MS, 15 * 60 * 1000);

  return {
    port: parseNumber(env.PORT, 3120),
    host: parseString(env.HOST) ?? "0.0.0.0",
    internalToken: parseString(env.INTERNAL_SERVICE_TOKEN),
    redisUrl: parseString(env.SEO_REDIS_URL),
    redisKeyPrefix: parseString(env.SEO_REDIS_KEY_PREFIX) ?? "seo-discovery-engine",
    cycleLockTtlMs: parseNumber(env.SEO_CYCLE_LOCK_TTL_MS, 30 * 60 * 1000),
    autoCycleEnabled: parseBoolean(env.SEO_AUTO_CYCLE_ENABLED, true),
    cycleIntervalMs: intervalMs,
    cycleStartupJitterMs: parseNumber(env.SEO_CYCLE_STARTUP_JITTER_MS, Math.floor(intervalMs / 5)),
    cycleActorId: parseString(env.SEO_CYCLE_ACTOR_ID) ?? "seo-superadmin",
    stateFilePath: parseString(env.SEO_STATE_FILE_PATH) ?? ".pulsco/seo-control-center/state.json",
    historyLimit: parseNumber(env.SEO_HISTORY_LIMIT, 200),
    feedTimeoutMs: parseNumber(env.SEO_FEED_TIMEOUT_MS, 8000),
    feedEndpoints: {
      trendsUrl: parseString(env.SEO_TRENDS_FEED_URL),
      csiEventsUrl: parseString(env.SEO_CSI_EVENTS_FEED_URL),
      programmaticUrl: parseString(env.SEO_PROGRAMMATIC_FEED_URL),
      performanceUrl: parseString(env.SEO_PERFORMANCE_FEED_URL),
      refreshUrl: parseString(env.SEO_REFRESH_FEED_URL),
      deliveryUrl: parseString(env.SEO_DELIVERY_FEED_URL),
      gsoRouteUrl: parseString(env.SEO_GSO_ROUTE_URL)
    }
  };
}
