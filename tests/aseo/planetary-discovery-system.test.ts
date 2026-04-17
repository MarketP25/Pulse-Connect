import { validateHardRules } from "../../packages/aseo-core/src/hard-rules";
import { ContentRefreshEngine } from "../../packages/content-refresh-engine/src/engine";
import { ProgrammaticSEOEngine } from "../../packages/programmatic-seo/src/engine";
import { PlanetaryDiscoverySystem } from "../../packages/seo-control-center/src/orchestrator";
import { createCSIEvent } from "../../packages/csi/events";

describe("Planetary ASEO system", () => {
  it("prevents duplicate pages in programmatic generation", () => {
    const engine = new ProgrammaticSEOEngine();

    const result = engine.generate({
      services: ["digital services", "digital services"],
      cities: [
        {
          city: "Nairobi",
          country: "KE",
          language: "en",
          demandScore: 0.8,
          searchTheme: "digital services platform",
          notableEntity: "Nairobi"
        },
        {
          city: "Nairobi",
          country: "KE",
          language: "en",
          demandScore: 0.9,
          searchTheme: "digital services platform",
          notableEntity: "Nairobi"
        }
      ],
      countries: [
        {
          country: "KE",
          language: "en",
          demandScore: 0.9,
          searchTheme: "services in kenya"
        }
      ]
    });

    const paths = result.pages.map((page) => page.path);
    const uniquePaths = new Set(paths);

    expect(uniquePaths.size).toBe(paths.length);
    expect(result.duplicatesPrevented).toBeGreaterThan(0);
  });

  it("prioritizes stale and declining pages for refresh", () => {
    const refreshEngine = new ContentRefreshEngine();
    const now = Date.now();

    const execution = refreshEngine.execute([
      {
        path: "/services-in-ke",
        topic: "Services in Kenya",
        primaryKeyword: "services in kenya",
        language: "en",
        kind: "landing",
        valueScore: 0.9,
        trafficDelta: -0.25,
        citationTrend: -0.2,
        lastUpdatedAt: now - 100 * 24 * 60 * 60 * 1000
      },
      {
        path: "/services-in-za",
        topic: "Services in South Africa",
        primaryKeyword: "services in south africa",
        language: "en",
        kind: "landing",
        valueScore: 0.2,
        trafficDelta: 0.05,
        citationTrend: 0.1,
        lastUpdatedAt: now - 10 * 24 * 60 * 60 * 1000
      }
    ]);

    expect(execution.plan.length).toBe(1);
    expect(execution.plan[0]?.path).toBe("/services-in-ke");
    expect(execution.refreshedAssets[0]?.schema.organization).toBeDefined();
  });

  it("enforces hard rules for missing schema and audit", () => {
    const report = validateHardRules({
      pagePath: "/services/kenya",
      content: "# Services in Kenya\nPulsco delivers services in Kenya.",
      primaryKeyword: "services",
      hasSchema: false,
      isStructured: true,
      isDuplicate: false,
      hasAudit: false
    });

    expect(report.passed).toBe(false);
    expect(report.violations.some((violation) => violation.code === "missing_schema")).toBe(true);
    expect(report.violations.some((violation) => violation.code === "missing_audit")).toBe(true);
  });

  it("runs the full discovery loop with MARP audit gating", () => {
    const system = new PlanetaryDiscoverySystem({
      edgeNodes: [
        {
          id: "edge-af-east-1",
          region: "africa-east",
          countries: ["KE", "UG", "TZ"],
          languages: ["en", "sw"],
          medianLatencyMs: 35
        },
        {
          id: "edge-eu-west-1",
          region: "europe-west",
          countries: ["GB", "FR", "DE"],
          languages: ["en", "fr", "de"],
          medianLatencyMs: 48
        }
      ]
    });

    const csiEvent = createCSIEvent({
      subsystem: "marketing",
      eventType: "search.query.trending",
      region: "KE",
      metrics: {
        query: "digital services platform",
        queryCount: 140,
        trendDelta: 0.62,
        language: "en"
      },
      riskScore: 20,
      performanceScore: 88
    });

    const result = system.runCycle({
      cycleId: "cycle-2026-04-17-01",
      actorId: "seo-superadmin",
      searchTrendSignals: [
        {
          keyword: "digital services platform",
          region: "KE",
          language: "en",
          source: "search-trend",
          volume: 240,
          momentum: 0.7,
          difficulty: 0.38,
          timestamp: Date.now()
        }
      ],
      csiEvents: [csiEvent],
      programmaticInput: {
        services: ["digital services platform"],
        cities: [
          {
            city: "Nairobi",
            country: "KE",
            language: "en",
            demandScore: 0.88,
            searchTheme: "digital services platform",
            notableEntity: "Nairobi"
          }
        ],
        countries: [
          {
            country: "KE",
            language: "en",
            demandScore: 0.9,
            searchTheme: "services in kenya"
          }
        ]
      },
      performanceSignals: [
        {
          path: "/services-in-ke",
          title: "Services in Kenya | Pulsco",
          metaDescription: "Legacy description",
          h1: "Services in Kenya",
          targetKeyword: "services in kenya",
          averagePosition: 19,
          positionDelta: -4,
          trafficDelta: -0.3,
          ctr: 0.018
        }
      ],
      refreshCandidates: [
        {
          path: "/services-in-ke",
          topic: "Services in Kenya",
          primaryKeyword: "services in kenya",
          language: "en",
          kind: "landing",
          valueScore: 0.95,
          trafficDelta: -0.3,
          citationTrend: -0.2,
          lastUpdatedAt: Date.now() - 110 * 24 * 60 * 60 * 1000
        }
      ],
      deliveryRequests: [
        {
          country: "KE",
          path: "/services-in-ke",
          acceptedLanguages: ["en-KE", "sw"]
        }
      ]
    });

    expect(result.auditId).toBeTruthy();
    expect(result.summary.generatedAssets).toBeGreaterThan(0);
    expect(result.summary.csiDirectives).toBeGreaterThan(0);
    expect(result.dashboard.contentHealth.schemaCoverage).toBeGreaterThan(0.9);
    expect(result.deployed).toBe(true);
  });
});
