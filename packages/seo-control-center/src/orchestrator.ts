import {
  HardRuleReport,
  KeywordIntelligenceEngine,
  MARPGovernanceLedger,
  validateHardRules
} from "@pulsco/aseo-core";
import { ASEOContentEngine } from "@pulsco/aseo-content-engine";
import { ASEOCSIAdapter } from "@pulsco/aseo-csi-adapter";
import { AuthorityDistributionEngine } from "@pulsco/authority-engine";
import { ContentRefreshEngine } from "@pulsco/content-refresh-engine";
import { GSODeliveryEngine, PLANETARY_EDGE_NODES } from "@pulsco/gso-delivery-engine";
import { InternalLinkingEngine } from "@pulsco/linking-engine";
import { ProgrammaticSEOEngine } from "@pulsco/programmatic-seo";
import { SEORealtimeAdjustmentEngine } from "@pulsco/seo-realtime-engine";
import { validateSchemaBundle } from "@pulsco/seo-schema-engine";
import { CSISEODirectiveEngine } from "@pulsco/csi";
import { SEOControlCenterDashboard } from "./dashboard";
import { DashboardSnapshot, DiscoveryCycleInput, DiscoveryCycleResult } from "./types";

function average(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export interface PlanetaryDiscoverySystemOptions {
  edgeNodes?: ConstructorParameters<typeof GSODeliveryEngine>[0];
}

export class PlanetaryDiscoverySystem {
  private readonly keywordEngine = new KeywordIntelligenceEngine();
  private readonly contentEngine = new ASEOContentEngine();
  private readonly csiAdapter = new ASEOCSIAdapter();
  private readonly csiDirectiveEngine = new CSISEODirectiveEngine();
  private readonly programmaticEngine = new ProgrammaticSEOEngine();
  private readonly realtimeEngine = new SEORealtimeAdjustmentEngine();
  private readonly refreshEngine = new ContentRefreshEngine(this.contentEngine);
  private readonly linkingEngine = new InternalLinkingEngine();
  private readonly authorityEngine = new AuthorityDistributionEngine();
  private readonly gsoEngine: GSODeliveryEngine;
  private readonly governance = new MARPGovernanceLedger();
  private readonly dashboard = new SEOControlCenterDashboard();

  constructor(options: PlanetaryDiscoverySystemOptions = {}) {
    this.gsoEngine = new GSODeliveryEngine(options.edgeNodes ?? PLANETARY_EDGE_NODES);
  }

  runCycle(input: DiscoveryCycleInput): DiscoveryCycleResult {
    // collect
    this.csiAdapter.ingest(input.csiEvents);
    const csiSignals = this.csiAdapter.toKeywordSignals();
    const allSignals = [...input.searchTrendSignals, ...csiSignals];
    this.keywordEngine.ingestSignals(allSignals);

    // analyze
    const keywordInsights = this.keywordEngine.buildInsights({ limit: 120 });
    const triggerSignals = this.csiAdapter.buildContentTriggers();
    const csiDirectives = this.csiDirectiveEngine.build(input.csiEvents, {
      minPriority: "medium"
    });

    // generate
    const programmatic = this.programmaticEngine.generate(input.programmaticInput);
    const generatedAssets = programmatic.pages.map((page) => {
      const topic = page.city
        ? `Pulsco in ${page.city}`
        : page.service
          ? `Best ${page.service} Near Me`
          : `Services in ${page.country}`;

      const questionSeed = keywordInsights
        .filter((insight) => insight.region.toUpperCase() === page.country.toUpperCase())
        .slice(0, 3)
        .map((insight) => `How does Pulsco address ${insight.keyword}`);
      const matchedDirective = csiDirectives.find(
        (directive) =>
          directive.region === page.country.toUpperCase() ||
          (page.city && directive.region === page.city.toUpperCase())
      );
      const directiveQuestions =
        matchedDirective && matchedDirective.query
          ? [
              `Why is ${matchedDirective.query} accelerating in ${matchedDirective.region}`,
              `How should Pulsco prioritize ${matchedDirective.query} in ${matchedDirective.region}`
            ]
          : [];

      return this.contentEngine.generate({
        kind: page.template === "service_near_me" ? "landing" : page.city ? "location" : "landing",
        topic,
        primaryKeyword: page.localData.searchTheme,
        service: page.service,
        city: page.city,
        country: page.country,
        language: page.language,
        entities: [page.localData.notableEntity, page.country, page.city, page.service].filter(
          (entity): entity is string => Boolean(entity)
        ),
        questions: [...questionSeed, ...directiveQuestions]
      });
    });

    // optimize
    const realtimeAdjustments = this.realtimeEngine.buildAdjustments(
      input.performanceSignals,
      triggerSignals
    );

    const refreshExecution = this.refreshEngine.execute(input.refreshCandidates);

    const linking = this.linkingEngine.generateLinks(
      generatedAssets.map((asset) => ({
        path: `/${asset.slug}`,
        title: asset.title,
        primaryTopic: asset.title,
        entities: asset.entities,
        keywords: [asset.title, ...asset.entities]
      }))
    );

    // govern + hard rules
    const actionIds: string[] = [];
    const hardRuleReports: HardRuleReport[] = [];
    const seenPaths = new Set<string>();

    for (const asset of [...generatedAssets, ...refreshExecution.refreshedAssets]) {
      const pagePath = `/${asset.slug}`;
      const isDuplicate = seenPaths.has(pagePath);
      seenPaths.add(pagePath);
      const schemaValidation = validateSchemaBundle(asset.schema, ["organization", "faq"]);
      const primaryKeyword =
        asset.entities.find((entity) => entity.toLowerCase() !== "pulsco") ?? "discoverability";
      const report = validateHardRules({
        pagePath,
        content: asset.markdown,
        primaryKeyword: primaryKeyword.toLowerCase(),
        hasSchema: schemaValidation.valid,
        isStructured: asset.extractabilityScore >= 70,
        isDuplicate,
        hasAudit: true
      });

      hardRuleReports.push(report);

      const publishAction = this.governance.logAction({
        action: "content_publish",
        page: pagePath,
        approved: report.passed,
        actorId: input.actorId,
        previousState: {},
        nextState: {
          title: asset.title,
          score: asset.extractabilityScore,
          locale: asset.locale
        }
      });

      actionIds.push(publishAction.id);

      const schemaAction = this.governance.logAction({
        action: "schema_attach",
        page: pagePath,
        approved: schemaValidation.valid,
        actorId: input.actorId,
        previousState: {},
        nextState: asset.schema
      });

      actionIds.push(schemaAction.id);
    }

    for (const adjustment of realtimeAdjustments) {
      const action = this.governance.logAction({
        action: adjustment.h1 ? "heading_update" : "meta_update",
        page: adjustment.path,
        approved: true,
        actorId: input.actorId,
        previousState: {},
        nextState: adjustment
      });

      actionIds.push(action.id);
    }

    for (const link of linking.links) {
      const action = this.governance.logAction({
        action: "internal_link_update",
        page: link.from,
        approved: true,
        actorId: input.actorId,
        previousState: {},
        nextState: link,
        reversible: true
      });

      actionIds.push(action.id);
    }

    const violations = hardRuleReports
      .flatMap((report) => report.violations)
      .map((violation) => violation.message);

    const audit = this.governance.createDeploymentAudit({
      cycleId: input.cycleId,
      approvedBy: input.actorId,
      checkedActions: actionIds,
      violations
    });

    let deployed = false;
    if (audit.approved) {
      this.governance.assertDeploymentApproved(audit.id);
      deployed = true;
    }

    // deploy
    if (deployed) {
      const plan = this.authorityEngine.buildDistributionPlan(
        [...generatedAssets, ...refreshExecution.refreshedAssets].map((asset) => ({
          id: asset.id,
          title: asset.title,
          canonicalPath: `/${asset.slug}`,
          summary: asset.optimized.directAnswer.join(" "),
          entities: asset.entities,
          citationsReady: asset.citationsReady
        }))
      );

      for (const item of plan.slice(0, 40)) {
        this.governance.logAction({
          action: "distribution_publish",
          page: item.endpoint,
          approved: true,
          actorId: input.actorId,
          previousState: {},
          nextState: item,
          reversible: false
        });

        if (item.thirdParty) {
          this.authorityEngine.recordCitation({
            assetId: item.assetId,
            source: item.channel,
            thirdParty: true,
            citedAt: Date.now()
          });
        }
      }

      for (const request of input.deliveryRequests) {
        this.gsoEngine.route(request);
      }
    }

    // monitor
    const authority = this.authorityEngine.getSnapshot();
    const avgPosition = average(input.performanceSignals.map((signal) => signal.averagePosition));
    const avgTrafficDelta = average(input.performanceSignals.map((signal) => signal.trafficDelta));
    const schemaCoverage =
      generatedAssets.length === 0
        ? 0
        : hardRuleReports.filter((report) =>
            report.violations.every((violation) => violation.code !== "missing_schema")
          ).length / hardRuleReports.length;

    const dashboard: DashboardSnapshot = {
      timestamp: Date.now(),
      rankings: {
        averagePosition: Number(avgPosition.toFixed(2)),
        droppedPages: input.performanceSignals.filter((signal) => signal.positionDelta <= -1).length,
        improvedPages: input.performanceSignals.filter((signal) => signal.positionDelta >= 1).length
      },
      aiCitations: {
        total: authority.totalCitations,
        thirdPartyShare: authority.thirdPartyShare,
        velocity: authority.citationVelocity
      },
      traffic: {
        averageDelta: Number(avgTrafficDelta.toFixed(4)),
        decliningPages: input.performanceSignals.filter((signal) => signal.trafficDelta < 0).length,
        stableOrGrowingPages: input.performanceSignals.filter((signal) => signal.trafficDelta >= 0).length
      },
      contentHealth: {
        generatedAssets: generatedAssets.length,
        schemaCoverage: Number(schemaCoverage.toFixed(4)),
        avgExtractability: Number(
          average(generatedAssets.map((asset) => asset.extractabilityScore)).toFixed(2)
        ),
        refreshQueued: refreshExecution.plan.length
      },
      csiInsights: {
        triggerCount: triggerSignals.length,
        highUrgencyTriggers: triggerSignals.filter((trigger) => trigger.urgency === "high").length,
        topRegions: triggerSignals.slice(0, 5).map((trigger) => trigger.region)
      }
    };

    this.dashboard.push(dashboard);

    return {
      cycleId: input.cycleId,
      deployed,
      auditId: audit.id,
      violations,
      dashboard,
      summary: {
        keywordInsights: keywordInsights.length,
        csiDirectives: csiDirectives.length,
        generatedAssets: generatedAssets.length,
        programmaticPages: programmatic.pages.length,
        realtimeAdjustments: realtimeAdjustments.length,
        refreshPlanned: refreshExecution.plan.length,
        linksGenerated: linking.links.length
      }
    };
  }

  getDashboard(): SEOControlCenterDashboard {
    return this.dashboard;
  }
}
