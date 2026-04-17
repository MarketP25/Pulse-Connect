import { createCSIEvent } from "../events";
import { CSISEODirectiveEngine } from "../engine/aseo-directives";

describe("CSI SEO directive engine", () => {
  it("builds high-priority directives for trending queries", () => {
    const engine = new CSISEODirectiveEngine();

    const directives = engine.build([
      createCSIEvent({
        subsystem: "marketing",
        eventType: "search.query.trending",
        region: "KE",
        metrics: {
          query: "digital services platform",
          queryCount: 220,
          trendDelta: 0.8,
          rankingDelta: -3
        },
        riskScore: 14,
        performanceScore: 82
      })
    ]);

    expect(directives.length).toBe(1);
    expect(directives[0].priority === "high" || directives[0].priority === "critical").toBe(true);
    expect(directives[0].type).toBe("metadata_adjustment");
  });

  it("deduplicates directives by region/query/type", () => {
    const engine = new CSISEODirectiveEngine();
    const event = createCSIEvent({
      subsystem: "marketing",
      eventType: "search.query.trending",
      region: "NG",
      metrics: {
        query: "best payment platform",
        queryCount: 150,
        trendDelta: 0.6
      },
      riskScore: 10,
      performanceScore: 80
    });

    const directives = engine.build([event, event]);
    expect(directives.length).toBe(1);
  });
});
