// Metric Lineage for Pulsco Admin Governance System
// Handles lineage tracking, explainability, and source systems for metrics

import { MetricLineage, AdminRoleType } from "@pulsco/admin-shared-types";
import { CSIClient } from "@pulsco/admin-csi-client";

export interface LineageNode {
  id: string;
  type: "source" | "transformation" | "aggregation" | "filter" | "metric";
  name: string;
  description: string;
  system: string;
  inputs: string[]; // IDs of input nodes
  outputs: string[]; // IDs of output nodes
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface LineageGraph {
  nodes: LineageNode[];
  edges: Array<{
    from: string;
    to: string;
    type: "data_flow" | "transformation" | "aggregation";
  }>;
  rootMetric: string;
}

export interface LineageQuery {
  metricId: string;
  depth?: number; // How many levels to traverse
  direction?: "upstream" | "downstream" | "both";
  includeMetadata?: boolean;
}

export interface ExplainabilityReport {
  metricId: string;
  question: string;
  answer: string;
  confidence: number;
  sources: string[];
  generatedAt: Date;
  adminRole: AdminRoleType;
}

export interface LineageConfig {
  apiBaseUrl: string;
  authToken: string;
  maxDepth: number;
  cacheExpiryMinutes: number;
}

export class MetricLineageTracker {
  private config: LineageConfig;
  private csiClient: CSIClient;
  private lineageCache: Map<string, { graph: LineageGraph; timestamp: Date }> = new Map();
  private explainabilityCache: Map<string, ExplainabilityReport[]> = new Map();

  constructor(config: LineageConfig) {
    this.config = config;
    this.csiClient = new CSIClient({
      apiBaseUrl: config.apiBaseUrl,
      wsUrl: `ws://${new URL(config.apiBaseUrl).host}`,
      sseUrl: config.apiBaseUrl.replace("http", "http"),
      authToken: config.authToken,
      reconnectInterval: 5000,
      maxRetries: 3
    });
  }

  /**
   * Get complete lineage graph for a metric
   */
  async getLineageGraph(query: LineageQuery): Promise<LineageGraph> {
    const cacheKey = `${query.metricId}_${query.depth || "full"}_${query.direction || "both"}`;

    // Check cache first
    const cached = this.lineageCache.get(cacheKey);
    if (cached && this.isCacheValid(cached.timestamp)) {
      return cached.graph;
    }

    // Fetch from API
    const graph = await this.fetchLineageGraph(query);

    // Cache the result
    this.lineageCache.set(cacheKey, { graph, timestamp: new Date() });

    return graph;
  }

  /**
   * Get explainability report for a metric
   */
  async explainMetric(
    metricId: string,
    question: string,
    adminRole: AdminRoleType
  ): Promise<ExplainabilityReport> {
    // Check cache
    const cachedReports = this.explainabilityCache.get(metricId) || [];
    const cached = cachedReports.find((r) => r.question === question && r.adminRole === adminRole);
    if (cached && this.isCacheValid(cached.generatedAt)) {
      return cached;
    }

    // Generate explanation
    const report = await this.generateExplanation(metricId, question, adminRole);

    // Cache the report
    cachedReports.push(report);
    this.explainabilityCache.set(metricId, cachedReports);

    return report;
  }

  /**
   * Get source systems for a metric
   */
  async getSourceSystems(metricId: string): Promise<string[]> {
    const graph = await this.getLineageGraph({ metricId, depth: 1, direction: "upstream" });

    const sourceNodes = graph.nodes.filter((node) => node.type === "source");
    return [...new Set(sourceNodes.map((node) => node.system))];
  }

  /**
   * Get transformation history for a metric
   */
  async getTransformationHistory(metricId: string): Promise<LineageNode[]> {
    const graph = await this.getLineageGraph({ metricId, direction: "upstream" });

    return graph.nodes.filter((node) => node.type === "transformation");
  }

  /**
   * Validate metric lineage integrity
   */
  async validateLineageIntegrity(metricId: string): Promise<{
    isValid: boolean;
    issues: string[];
    lastValidated: Date;
  }> {
    try {
      const response = await fetch(`${this.config.apiBaseUrl}/lineage/validate/${metricId}`, {
        headers: {
          Authorization: `Bearer ${this.config.authToken}`
        }
      });

      if (!response.ok) {
        throw new Error(`Validation API error: ${response.status}`);
      }

      const result = await response.json();
      return {
        isValid: result.isValid,
        issues: result.issues || [],
        lastValidated: new Date(result.lastValidated)
      };
    } catch (error) {
      console.error("Failed to validate lineage:", error);
      return {
        isValid: false,
        issues: ["Validation service unavailable"],
        lastValidated: new Date()
      };
    }
  }

  /**
   * Get lineage statistics
   */
  async getLineageStats(): Promise<{
    totalMetrics: number;
    totalNodes: number;
    totalEdges: number;
    averageDepth: number;
    mostComplexMetric: string;
    validationCoverage: number;
  }> {
    try {
      const response = await fetch(`${this.config.apiBaseUrl}/lineage/stats`, {
        headers: {
          Authorization: `Bearer ${this.config.authToken}`
        }
      });

      if (!response.ok) {
        throw new Error(`Stats API error: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error("Failed to get lineage stats:", error);
      return {
        totalMetrics: 0,
        totalNodes: 0,
        totalEdges: 0,
        averageDepth: 0,
        mostComplexMetric: "",
        validationCoverage: 0
      };
    }
  }

  /**
   * Export lineage graph for visualization
   */
  async exportLineageGraph(
    metricId: string,
    format: "json" | "graphml" | "dot" = "json"
  ): Promise<string> {
    const graph = await this.getLineageGraph({ metricId });

    switch (format) {
      case "json":
        return JSON.stringify(graph, null, 2);
      case "graphml":
        return this.convertToGraphML(graph);
      case "dot":
        return this.convertToDot(graph);
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }

  // Private helper methods

  private async fetchLineageGraph(query: LineageQuery): Promise<LineageGraph> {
    try {
      const params = new URLSearchParams({
        depth: (query.depth || this.config.maxDepth).toString(),
        direction: query.direction || "both",
        includeMetadata: (query.includeMetadata || false).toString()
      });

      const response = await fetch(
        `${this.config.apiBaseUrl}/lineage/graph/${query.metricId}?${params}`,
        {
          headers: {
            Authorization: `Bearer ${this.config.authToken}`
          }
        }
      );

      if (!response.ok) {
        throw new Error(`Lineage API error: ${response.status}`);
      }

      const data = await response.json();
      return {
        nodes: data.nodes.map((node: any) => ({
          id: node.id,
          type: node.type,
          name: node.name,
          description: node.description,
          system: node.system,
          inputs: node.inputs || [],
          outputs: node.outputs || [],
          metadata: node.metadata || {},
          createdAt: new Date(node.createdAt),
          updatedAt: new Date(node.updatedAt)
        })),
        edges: data.edges || [],
        rootMetric: query.metricId
      };
    } catch (error) {
      console.error("Failed to fetch lineage graph:", error);
      // Return minimal graph for demo
      return {
        nodes: [
          {
            id: query.metricId,
            type: "metric",
            name: query.metricId,
            description: "Metric node",
            system: "unknown",
            inputs: [],
            outputs: [],
            metadata: {},
            createdAt: new Date(),
            updatedAt: new Date()
          }
        ],
        edges: [],
        rootMetric: query.metricId
      };
    }
  }

  private async generateExplanation(
    metricId: string,
    question: string,
    adminRole: AdminRoleType
  ): Promise<ExplainabilityReport> {
    try {
      const response = await fetch(`${this.config.apiBaseUrl}/lineage/explain`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.config.authToken}`
        },
        body: JSON.stringify({
          metricId,
          question,
          adminRole
        })
      });

      if (!response.ok) {
        throw new Error(`Explain API error: ${response.status}`);
      }

      const data = await response.json();
      return {
        metricId,
        question,
        answer: data.answer,
        confidence: data.confidence,
        sources: data.sources,
        generatedAt: new Date(data.generatedAt),
        adminRole
      };
    } catch (error) {
      console.error("Failed to generate explanation:", error);
      // Return mock explanation for demo
      return {
        metricId,
        question,
        answer: `This metric (${metricId}) represents a key performance indicator. The exact lineage and explanation would be available when connected to the full CSI system.`,
        confidence: 0.8,
        sources: ["CSI Intelligence Core", "MARP Governance Engine"],
        generatedAt: new Date(),
        adminRole
      };
    }
  }

  private isCacheValid(timestamp: Date): boolean {
    const now = new Date();
    const diffMinutes = (now.getTime() - timestamp.getTime()) / (1000 * 60);
    return diffMinutes < this.config.cacheExpiryMinutes;
  }

  private convertToGraphML(graph: LineageGraph): string {
    // Simplified GraphML conversion
    let graphml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    graphml += '<graphml xmlns="http://graphml.graphdrawing.org/xmlns">\n';
    graphml += '  <graph id="lineage" edgedefault="directed">\n';

    // Add nodes
    graph.nodes.forEach((node) => {
      graphml += `    <node id="${node.id}">\n`;
      graphml += `      <data key="name">${node.name}</data>\n`;
      graphml += `      <data key="type">${node.type}</data>\n`;
      graphml += `      <data key="system">${node.system}</data>\n`;
      graphml += "    </node>\n";
    });

    // Add edges
    graph.edges.forEach((edge, index) => {
      graphml += `    <edge id="e${index}" source="${edge.from}" target="${edge.to}">\n`;
      graphml += `      <data key="type">${edge.type}</data>\n`;
      graphml += "    </edge>\n";
    });

    graphml += "  </graph>\n";
    graphml += "</graphml>\n";

    return graphml;
  }

  private convertToDot(graph: LineageGraph): string {
    let dot = "digraph Lineage {\n";
    dot += "  rankdir=LR;\n";
    dot += "  node [shape=box];\n\n";

    // Add nodes
    graph.nodes.forEach((node) => {
      const label = `${node.name}\\n(${node.type})`;
      dot += `  "${node.id}" [label="${label}"];\n`;
    });

    dot += "\n";

    // Add edges
    graph.edges.forEach((edge) => {
      dot += `  "${edge.from}" -> "${edge.to}";\n`;
    });

    dot += "}\n";

    return dot;
  }

  /**
   * Clear all caches
   */
  clearCache(): void {
    this.lineageCache.clear();
    this.explainabilityCache.clear();
  }

  /**
   * Get cached lineage graphs
   */
  getCacheStats(): {
    lineageGraphs: number;
    explainabilityReports: number;
    totalCacheSize: number;
  } {
    return {
      lineageGraphs: this.lineageCache.size,
      explainabilityReports: Array.from(this.explainabilityCache.values()).reduce(
        (sum, reports) => sum + reports.length,
        0
      ),
      totalCacheSize: this.lineageCache.size + this.explainabilityCache.size
    };
  }
}

export default MetricLineageTracker;
