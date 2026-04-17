import express from "express";
import cors from "cors";
import { loadConfig } from "./config";
import { requireInternalToken } from "./auth";
import { DiscoveryCycleScheduler } from "./scheduler";
import { DiscoveryEngineRuntime, HttpDiscoveryFeeds } from "./runtime";

async function bootstrap() {
  const config = loadConfig();
  const feeds = new HttpDiscoveryFeeds(config.feedEndpoints, config.feedTimeoutMs);
  const runtime = new DiscoveryEngineRuntime(
    {
      stateFilePath: config.stateFilePath,
      historyLimit: config.historyLimit,
      cycleActorId: config.cycleActorId
    },
    feeds
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
      version: state.version
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
            violations: latest.result.violations
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
        }
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
          }
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
        deployed: run?.result.deployed ?? null
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
        timestamp: new Date().toISOString()
      })
    );
  });

  process.on("SIGINT", () => {
    scheduler.stop();
    server.close(() => process.exit(0));
  });

  process.on("SIGTERM", () => {
    scheduler.stop();
    server.close(() => process.exit(0));
  });
}

void bootstrap();
