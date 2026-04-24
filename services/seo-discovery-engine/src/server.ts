import express from "express";
import cors from "cors";
import { loadConfig } from "./config";
import { requireInternalToken } from "./auth";
import { DiscoveryCycleScheduler } from "./scheduler";
import {
  DiscoveryEngineRuntime,
  HttpDiscoveryFeeds,
  RedisCycleLock,
  RedisStateStore
} from "./runtime";

type RedisClient = {
  connect?: () => Promise<void>;
  ping: () => Promise<unknown>;
  quit: () => Promise<unknown>;
  get: (key: string) => Promise<string | null>;
  set: (...args: unknown[]) => Promise<unknown>;
  eval: (...args: unknown[]) => Promise<unknown>;
};

type RedisConstructor = new (
  url: string,
  options?: Record<string, unknown>
) => RedisClient;

function loadRedisConstructor(): RedisConstructor | null {
  try {
    const required = (eval("require") as (id: string) => unknown)("ioredis") as {
      default?: RedisConstructor;
    } & RedisConstructor;
    return required.default ?? (required as RedisConstructor);
  } catch {
    return null;
  }
}

async function bootstrap() {
  const config = loadConfig();
  const feeds = new HttpDiscoveryFeeds(config.feedEndpoints, config.feedTimeoutMs);

  let redisClient: RedisClient | undefined;
  let runtimeStorage: "file" | "redis" = "file";
  let runtimeDeps: ConstructorParameters<typeof DiscoveryEngineRuntime>[2] = {};

  if (config.redisUrl) {
    const Redis = loadRedisConstructor();
    if (Redis) {
      try {
        redisClient = new Redis(config.redisUrl, {
          lazyConnect: true,
          maxRetriesPerRequest: 1,
          enableReadyCheck: true
        });
        await redisClient.connect?.();
        await redisClient.ping();

        const redisPrefix = config.redisKeyPrefix;
        runtimeDeps = {
          stateStore: new RedisStateStore(redisClient, `${redisPrefix}:state`, config.historyLimit),
          cycleLock: new RedisCycleLock(
            redisClient,
            `${redisPrefix}:cycle-lock`,
            config.cycleLockTtlMs
          )
        };
        runtimeStorage = "redis";
      } catch {
        if (redisClient) {
          await redisClient.quit().catch(() => undefined);
        }
        redisClient = undefined;
        runtimeDeps = {};
        runtimeStorage = "file";
      }
    }
  }

  const runtime = new DiscoveryEngineRuntime(
    {
      stateFilePath: config.stateFilePath,
      historyLimit: config.historyLimit,
      cycleActorId: config.cycleActorId,
      internalToken: config.internalToken,
      redisKeyPrefix: config.redisKeyPrefix,
      cycleLockTtlMs: config.cycleLockTtlMs,
      gsoRouteUrl: config.feedEndpoints.gsoRouteUrl,
      gsoRouteTimeoutMs: config.feedTimeoutMs
    },
    feeds,
    runtimeDeps
  );

  await runtime.init();

  const scheduler = new DiscoveryCycleScheduler(
    runtime,
    config.cycleIntervalMs,
    config.cycleStartupJitterMs
  );

  if (config.autoCycleEnabled) {
    await scheduler.start();
  }

  const app = express();
  app.use(cors());
  app.use(express.json({ limit: "2mb" }));

  app.get("/health", (_req, res) => {
    const state = runtime.getState();
    const latest = state.latest;

    res.json({
      service: "seo-discovery-engine",
      status: "ok",
      timestamp: new Date().toISOString(),
      executing: runtime.isExecuting(),
      autoCycleEnabled: config.autoCycleEnabled,
      scheduler: scheduler.status(),
      storage: runtimeStorage,
      gsoLinkage: latest?.delivery.mode ?? "local-only",
      lastCycleId: latest?.cycleId,
      lastCycleCompletedAt: latest?.completedAt
    });
  });

  app.get("/ready", (_req, res) => {
    const state = runtime.getState();
    const ready = Boolean(state.version);
    if (!ready) {
      return res.status(503).json({
        status: "not_ready"
      });
    }

    return res.json({
      status: "ready",
      version: state.version,
      storage: runtimeStorage
    });
  });

  app.get("/api/v1/seo/dashboard", (_req, res) => {
    const latest = runtime.getState().latest;
    res.json({
      dashboard: latest?.result.dashboard ?? null,
      latestCycle: latest
        ? {
            cycleId: latest.cycleId,
            completedAt: latest.completedAt,
            deployed: latest.result.deployed,
            violations: latest.result.violations,
            delivery: latest.delivery
          }
        : null
    });
  });

  app.get("/api/v1/seo/cycles", (req, res) => {
    const limitRaw = req.query.limit;
    const limit =
      typeof limitRaw === "string" && Number.isFinite(Number(limitRaw))
        ? Math.max(1, Math.min(100, Number(limitRaw)))
        : 20;

    const cycles = runtime
      .getState()
      .cycles.slice(-limit)
      .reverse()
      .map((cycle) => ({
        cycleId: cycle.cycleId,
        reason: cycle.reason,
        startedAt: cycle.startedAt,
        completedAt: cycle.completedAt,
        deployed: cycle.result.deployed,
        summary: cycle.result.summary,
        violations: cycle.result.violations,
        csi: {
          directives: cycle.csi.directives.length,
          recommendations: cycle.csi.recommendations.length,
          governanceDecisions: cycle.csi.governanceDecisions.length
        },
        delivery: cycle.delivery
      }));

    res.json({ cycles });
  });

  app.get("/api/v1/seo/csi/latest", (_req, res) => {
    const latest = runtime.getState().latest;
    res.json({
      csi: latest
        ? {
            analysis: latest.csi.analysis,
            scores: latest.csi.scores,
            recommendations: latest.csi.recommendations,
            directives: latest.csi.directives,
            governanceDecisions: latest.csi.governanceDecisions
          }
        : null
    });
  });

  app.get("/api/v1/seo/gso/latest", (_req, res) => {
    const latest = runtime.getState().latest;
    res.json({
      gso: latest?.delivery ?? null
    });
  });

  app.post(
    "/api/v1/seo/cycle/run",
    requireInternalToken(config.internalToken),
    async (req, res) => {
      try {
        const body =
          req.body && typeof req.body === "object" ? (req.body as Record<string, unknown>) : {};
        const cycleId =
          typeof body.cycleId === "string" && body.cycleId.trim().length > 0
            ? body.cycleId.trim()
            : undefined;

        const run = await runtime.runCycle("manual", {
          cycleId,
          actorId: config.cycleActorId
        });

        res.status(202).json({
          cycleId: run.cycleId,
          deployed: run.result.deployed,
          auditId: run.result.auditId,
          summary: run.result.summary,
          csi: {
            directives: run.csi.directives.length,
            recommendations: run.csi.recommendations.length,
            governanceDecisions: run.csi.governanceDecisions.length
          },
          delivery: run.delivery
        });
      } catch (error) {
        res.status(409).json({
          error: "CYCLE_RUN_FAILED",
          message: error instanceof Error ? error.message : "Unknown error"
        });
      }
    }
  );

  app.post(
    "/api/v1/seo/scheduler/pause",
    requireInternalToken(config.internalToken),
    (req, res) => {
      void req;
      scheduler.pause();
      res.json({ status: "paused", scheduler: scheduler.status() });
    }
  );

  app.post(
    "/api/v1/seo/scheduler/resume",
    requireInternalToken(config.internalToken),
    (req, res) => {
      void req;
      scheduler.resume();
      res.json({ status: "resumed", scheduler: scheduler.status() });
    }
  );

  app.post(
    "/api/v1/seo/scheduler/run-once",
    requireInternalToken(config.internalToken),
    async (_req, res) => {
      const run = await scheduler.runOnce();
      res.json({
        executed: Boolean(run),
        cycleId: run?.cycleId,
        deployed: run?.result.deployed ?? null,
        delivery: run?.delivery ?? null
      });
    }
  );

  const server = app.listen(config.port, config.host, () => {
    console.log(
      JSON.stringify({
        level: "info",
        service: "seo-discovery-engine",
        event: "startup",
        port: config.port,
        host: config.host,
        autoCycleEnabled: config.autoCycleEnabled,
        cycleIntervalMs: config.cycleIntervalMs,
        storage: runtimeStorage,
        timestamp: new Date().toISOString()
      })
    );
  });

  const close = async () => {
    scheduler.stop();
    if (redisClient) {
      await redisClient.quit().catch(() => undefined);
    }
    server.close(() => process.exit(0));
  };

  process.on("SIGINT", () => {
    void close();
  });

  process.on("SIGTERM", () => {
    void close();
  });
}

void bootstrap();
