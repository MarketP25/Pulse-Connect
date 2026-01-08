import { Injectable } from '@nestjs/common';

@Injectable()
export class CognitiveComputingService {
  private knowledgeGraph: Map<string, any> = new Map();
  private expertRules: any[] = [];

  constructor() {
    this.initializeKnowledgeGraph();
    this.initializeExpertRules();
  }

  /**
   * Knowledge Graph with Semantic Inference
   * RDF-style triples with relationship analysis and inference
   */
  async buildKnowledgeGraph(data: any[]): Promise<any> {
    const triples = this.extractTriples(data);
    const graph = this.constructGraph(triples);
    const inferences = this.performInference(graph);
    const insights = this.generateInsights(graph, inferences);

    return {
      nodes: graph.nodes.length,
      relationships: graph.edges.length,
      inferences: inferences.length,
      insights,
      reliability: this.calculateGraphReliability(graph, inferences)
    };
  }

  /**
   * Semantic Reasoning Engine
   * Logical inference and conclusion drawing from knowledge graph
   */
  async performSemanticReasoning(query: any): Promise<any> {
    const relevantNodes = this.findRelevantNodes(query);
    const reasoning = this.applyReasoningRules(relevantNodes, query);
    const conclusions = this.drawConclusions(reasoning);

    return {
      query: query.criteria,
      relevantNodes: relevantNodes.length,
      reasoning: reasoning.steps,
      conclusions,
      confidence: this.calculateInferenceConfidence(reasoning.inferences)
    };
  }

  /**
   * Expert System with Fuzzy Logic
   * Rule-based decision making with uncertainty handling
   */
  async executeExpertSystem(facts: any[]): Promise<any> {
    const fuzzifiedFacts = this.fuzzifyFacts(facts);
    const ruleApplications = this.applyFuzzyRules(fuzzifiedFacts);
    const decisions = this.makeDecisions(ruleApplications);

    return {
      factsProcessed: facts.length,
      rulesApplied: ruleApplications.length,
      decisions,
      certainty: this.calculateOverallCertainty(decisions)
    };
  }

  /**
   * Swarm Intelligence Optimization
   * Ant Colony Optimization for complex decision problems
   */
  async optimizeWithSwarmIntelligence(problem: any): Promise<any> {
    const aco = this.initializeAntColonyOptimization(problem);
    const solution = await this.runOptimization(aco);

    return {
      problem: problem.description,
      iterations: aco.maxIterations,
      bestSolution: solution,
      convergence: this.checkConvergence(solution),
      pheromoneTrails: aco.pheromoneMatrix,
      executionTime: solution.executionTime
    };
  }

  // Knowledge Graph Implementation
  private extractTriples(data: any[]): any[] {
    const triples = [];

    data.forEach(item => {
      if (item.type === 'transaction') {
        triples.push({
          subject: item.userId,
          predicate: 'performed_transaction',
          object: item.transactionId,
          confidence: 0.95
        });

        triples.push({
          subject: item.transactionId,
          predicate: 'amount',
          object: item.amount,
          confidence: 0.98
        });

        triples.push({
          subject: item.transactionId,
          predicate: 'location',
          object: item.location,
          confidence: 0.9
        });
      }

      if (item.type === 'user') {
        triples.push({
          subject: item.userId,
          predicate: 'risk_score',
          object: item.riskScore,
          confidence: 0.85
        });
      }
    });

    return triples;
  }

  private constructGraph(triples: any[]): any {
    const nodes = new Set();
    const edges = [];

    triples.forEach(triple => {
      nodes.add(triple.subject);
      nodes.add(triple.object);

      edges.push({
        from: triple.subject,
        to: triple.object,
        label: triple.predicate,
        confidence: triple.confidence
      });
    });

    return {
      nodes: Array.from(nodes),
      edges,
      centrality: this.calculateCentrality(Array.from(nodes), edges)
    };
  }

  private performInference(graph: any): any[] {
    const inferences = [];

    // Transitive inference: if A -> B and B -> C, then A -> C
    graph.edges.forEach(edge1 => {
      graph.edges.forEach(edge2 => {
        if (edge1.to === edge2.from && edge1.from !== edge2.to) {
          inferences.push({
            type: 'transitive',
            conclusion: `${edge1.from} -> ${edge2.to}`,
            confidence: Math.min(edge1.confidence, edge2.confidence) * 0.9, // Reduce confidence
            path: [edge1, edge2]
          });
        }
      });
    });

    // Risk propagation: if user has high-risk transaction, mark as high-risk
    graph.edges.forEach(edge => {
      if (edge.label === 'performed_transaction') {
        const transactionEdges = graph.edges.filter(e => e.from === edge.to);
        const highRiskTransaction = transactionEdges.find(e =>
          e.label === 'amount' && parseFloat(e.to) > 5000
        );

        if (highRiskTransaction) {
          inferences.push({
            type: 'risk_propagation',
            conclusion: `${edge.from} is high_risk`,
            confidence: 0.8,
            evidence: [edge, highRiskTransaction]
          });
        }
      }
    });

    return inferences;
  }

  private generateInsights(graph: any, inferences: any[]): any {
    const insights = [];

    // Highly connected entities (potential fraud rings)
    const highConnectivity = Object.entries(graph.centrality)
      .filter(([, centrality]: [string, number]) => centrality > 5)
      .map(([node]) => node);

    if (highConnectivity.length > 0) {
      insights.push({
        type: 'connectivity_analysis',
        finding: `Highly connected entities: ${highConnectivity.join(', ')}`,
        severity: 'medium',
        recommendation: 'Investigate for potential fraud rings'
      });
    }

    // Geographic clustering
    const locations = graph.edges
      .filter(e => e.label === 'location')
      .map(e => e.to);

    const locationClusters = this.clusterLocations(locations);
    if (locationClusters.length > 3) {
      insights.push({
        type: 'geographic_clustering',
        finding: `${locationClusters.length} geographic clusters detected`,
        severity: 'low',
        recommendation: 'Monitor for regional fraud patterns'
      });
    }

    // Suspicious patterns
    const suspiciousPatterns = this.detectSuspiciousPatterns(graph);
    suspiciousPatterns.forEach(pattern => {
      insights.push({
        type: 'pattern_detection',
        finding: pattern.description,
        severity: pattern.severity,
        recommendation: pattern.recommendation
      });
    });

    return insights;
  }

  private calculateGraphReliability(graph: any, inferences: any[]): number {
    const edgeConfidence = graph.edges.reduce((sum, e) => sum + e.confidence, 0) / graph.edges.length;
    const inferenceConfidence = inferences.length > 0 ?
      inferences.reduce((sum, inf) => sum + inf.confidence, 0) / inferences.length : 1;

    return (edgeConfidence + inferenceConfidence) / 2;
  }

  // Semantic Reasoning Implementation
  private findRelevantNodes(query: any): any[] {
    const relevantNodes = [];

    this.knowledgeGraph.forEach((node, nodeId) => {
      let relevanceScore = 0;

      // Match query criteria
      if (query.userId && nodeId.includes(query.userId)) relevanceScore += 0.4;
      if (query.location && node.location === query.location) relevanceScore += 0.3;
      if (query.riskLevel && node.riskLevel === query.riskLevel) relevanceScore += 0.3;

      if (relevanceScore > 0.2) {
        relevantNodes.push({ ...node, relevanceScore });
      }
    });

    return relevantNodes.sort((a, b) => b.relevanceScore - a.relevanceScore);
  }

  private applyReasoningRules(nodes: any[], query: any): any {
    const steps = [];
    const inferences = [];

    // Deductive reasoning
    nodes.forEach(node => {
      if (node.riskLevel === 'high') {
        inferences.push({
          type: 'deductive',
          premise: `${node.id} has high risk`,
          conclusion: `${node.id} should be flagged for suspicious activity`,
          confidence: 0.9
        });
        steps.push(`Deduced suspicious activity for ${node.id}`);
      }
    });

    // Inductive reasoning
    const velocityPatterns = this.detectVelocityPatterns(nodes);
    if (velocityPatterns.highVelocity) {
      inferences.push({
        type: 'inductive',
        premise: `High transaction velocity detected`,
        conclusion: `Potential automated fraud activity`,
        confidence: 0.75
      });
      steps.push('Inducted potential automated fraud from velocity patterns');
    }

    return { steps, inferences };
  }

  private drawConclusions(reasoning: any): any[] {
    const conclusions = [];

    reasoning.inferences.forEach(inference => {
      const severity = this.determineSeverity(inference.confidence);
      conclusions.push({
        conclusion: inference.conclusion,
        confidence: inference.confidence,
        severity,
        evidence: inference.premise
      });
    });

    return conclusions;
  }

  private calculateInferenceConfidence(inferences: any[]): number {
    if (inferences.length === 0) return 0;
    return inferences.reduce((sum, inf) => sum + inf.confidence, 0) / inferences.length;
  }

  // Expert System Implementation
  private initializeExpertRules(): void {
    this.expertRules = [
      {
        id: 'fraud_detection_1',
        conditions: [
          { fact: 'amount', operator: '>', value: 5000, weight: 0.4 },
          { fact: 'location', operator: '!=', value: 'usual', weight: 0.3 },
          { fact: 'frequency', operator: '>', value: 10, weight: 0.3 }
        ],
        conclusion: 'high_fraud_risk',
        certainty: 0.85
      },
      {
        id: 'geographic_anomaly',
        conditions: [
          { fact: 'location', operator: '!=', value: 'usual', weight: 0.5 },
          { fact: 'distance', operator: '>', value: 1000, weight: 0.3 },
          { fact: 'time', operator: '<', value: 24, weight: 0.2 }
        ],
        conclusion: 'geographic_anomaly',
        certainty: 0.75
      },
      {
        id: 'velocity_check',
        conditions: [
          { fact: 'frequency', operator: '>', value: 20, weight: 0.4 },
          { fact: 'amount', operator: '>', value: 1000, weight: 0.3 },
          { fact: 'unique_locations', operator: '>', value: 5, weight: 0.3 }
        ],
        conclusion: 'velocity_anomaly',
        certainty: 0.8
      },
      {
        id: 'user_risk_assessment',
        conditions: [
          { fact: 'risk_score', operator: '>', value: 0.7, weight: 0.5 },
          { fact: 'recent_transactions', operator: '>', value: 15, weight: 0.3 },
          { fact: 'failed_attempts', operator: '>', value: 3, weight: 0.2 }
        ],
        conclusion: 'high_user_risk',
        certainty: 0.9
      }
    ];
  }

  private fuzzifyFacts(facts: any[]): any[] {
    return facts.map(fact => ({
      ...fact,
      fuzzyValue: this.fuzzifyValue(fact.type, fact.value)
    }));
  }

  private fuzzifyValue(type: string, value: any): string {
    switch (type) {
      case 'amount':
        if (value < 100) return 'low';
        if (value < 1000) return 'medium';
        return 'high';
      case 'frequency':
        if (value < 5) return 'low';
        if (value < 15) return 'medium';
        return 'high';
      case 'distance':
        if (value < 100) return 'low';
        if (value < 500) return 'medium';
        return 'high';
      case 'risk_score':
        if (value < 0.3) return 'low';
        if (value < 0.7) return 'medium';
        return 'high';
      default:
        return 'high'; // Default to high for unknown types
    }
  }

  private applyFuzzyRules(facts: any[]): any[] {
    const ruleApplications = [];

    this.expertRules.forEach(rule => {
      const satisfaction = this.evaluateRuleConditions(rule, facts);
      if (satisfaction > 0.5) { // Rule threshold
        ruleApplications.push({
          ruleId: rule.id,
          conclusion: rule.conclusion,
          satisfaction,
          certainty: rule.certainty * satisfaction,
          description: `${rule.id}: ${rule.conclusion}`
        });
      }
    });

    return ruleApplications;
  }

  private evaluateRuleConditions(rule: any, facts: any[]): number {
    let totalSatisfaction = 0;
    let totalWeight = 0;

    rule.conditions.forEach(condition => {
      const fact = facts.find(f => f.type === condition.fact);
      if (fact) {
        const satisfaction = this.evaluateCondition(condition, fact.fuzzyValue);
        totalSatisfaction += satisfaction * condition.weight;
        totalWeight += condition.weight;
      }
    });

    return totalWeight > 0 ? totalSatisfaction / totalWeight : 0;
  }

  private evaluateCondition(condition: any, fuzzyValue: string): number {
    // Simple fuzzy matching
    switch (condition.operator) {
      case '>':
        if (condition.fact === 'amount' && fuzzyValue === 'high') return 1;
        if (condition.fact === 'amount' && fuzzyValue === 'medium') return 0.5;
        return 0;
      case '!=':
        return fuzzyValue !== condition.value ? 1 : 0;
      case '<':
        if (condition.fact === 'time' && fuzzyValue === 'low') return 1;
        return 0;
      default:
        return 0;
    }
  }

  private makeDecisions(ruleApplications: any[]): any[] {
    const decisions = [];

    // Group by conclusion and take highest certainty
    const groupedConclusions = {};
    ruleApplications.forEach(app => {
      if (!groupedConclusions[app.conclusion] ||
          app.certainty > groupedConclusions[app.conclusion].certainty) {
        groupedConclusions[app.conclusion] = app;
      }
    });

    Object.values(groupedConclusions).forEach((app: any) => {
      decisions.push({
        decision: app.conclusion,
        certainty: app.certainty,
        rules: [app.ruleId],
        severity: this.determineSeverity(app.certainty)
      });
    });

    return decisions;
  }

  private calculateOverallCertainty(decisions: any[]): number {
    if (decisions.length === 0) return 0;
    return decisions.reduce((sum, d) => sum + d.certainty, 0) / decisions.length;
  }

  // Swarm Intelligence Implementation
  private initializeAntColonyOptimization(problem: any): any {
    return {
      numAnts: 20,
      maxIterations: 100,
      evaporationRate: 0.1,
      alpha: 1, // Pheromone importance
      beta: 2,  // Heuristic importance
      pheromoneMatrix: this.initializePheromoneMatrix(problem.nodes),
      problem
    };
  }

  private initializePheromoneMatrix(nodes: string[]): any {
    const matrix = {};
    nodes.forEach(node1 => {
      matrix[node1] = {};
      nodes.forEach(node2 => {
        if (node1 !== node2) {
          matrix[node1][node2] = 1.0; // Initial pheromone
        }
      });
    });
    return matrix;
  }

  private async runOptimization(aco: any): Promise<any> {
    let bestSolution = null;
    let bestFitness = -Infinity;

    for (let iteration = 0; iteration < aco.maxIterations; iteration++) {
      const solutions = [];

      // Each ant constructs a solution
      for (let ant = 0; ant < aco.numAnts; ant++) {
        const solution = this.constructAntSolution(aco, ant);
        const fitness = this.evaluateSolution(solution, aco.problem);

        solutions.push({ solution, fitness, ant });

        if (fitness > bestFitness) {
          bestFitness = fitness;
          bestSolution = solution;
        }
      }

      // Update pheromones
      this.updatePheromones(aco, solutions);

      // Check convergence
      if (this.checkConvergence({ fitness: bestFitness, iteration })) {
        break;
      }
    }

    return {
      solution: bestSolution,
      fitness: bestFitness,
      executionTime: Date.now(),
      converged: true
    };
  }

  private constructAntSolution(aco: any, antId: number): any[] {
    const solution = [];
    const visited = new Set();
    let currentNode = aco.problem.startNode || aco.problem.nodes[0];

    solution.push(currentNode);
    visited.add(currentNode);

    while (visited.size < aco.problem.nodes.length) {
      const candidates = aco.problem.nodes.filter(n => !visited.has(n));
      if (candidates.length === 0) break;

      const nextNode = this.selectNextNode(currentNode, candidates, aco);
      solution.push(nextNode);
      visited.add(nextNode);
      currentNode = nextNode;
    }

    return solution;
  }

  private selectNextNode(currentNode: string, candidates: string[], aco: any): string {
    const probabilities = candidates.map(candidate => {
      const pheromone = aco.pheromoneMatrix[currentNode][candidate] || 0.1;
      const heuristic = this.calculateHeuristic(currentNode, candidate, aco.problem);
      const tau = Math.pow(pheromone, aco.alpha);
      const eta = Math.pow(heuristic, aco.beta);

      return { node: candidate, probability: tau * eta };
    });

    // Roulette wheel selection
    const total = probabilities.reduce((sum, p) => sum + p.probability, 0);
    let random = Math.random() * total;

    for (const prob of probabilities) {
      random -= prob.probability;
      if (random <= 0) return prob.node;
    }

    return candidates[0]; // Fallback
  }

  private calculateHeuristic(from: string, to: string, problem: any): number {
    // Distance-based heuristic (inverse of distance)
    const distance = problem.distances?.[`${from}_${to}`] || 1;
    return 1 / distance;
  }

  private evaluateSolution(solution: any[], problem: any): number {
    // Simple fitness based on solution quality
    let fitness = 0;

    // Reward complete solutions
    if (solution.length === problem.nodes.length) {
      fitness += 100;
    }

    // Penalize incomplete solutions
    fitness -= (problem.nodes.length - solution.length) * 10;

    // Add problem-specific fitness
    fitness += this.calculateProblemSpecificFitness(solution, problem);

    return fitness;
  }

  private calculateProblemSpecificFitness(solution: any[], problem: any): number {
    // Placeholder for problem-specific fitness calculation
    return solution.length * 5; // Simple length-based fitness
  }

  private updatePheromones(aco: any, solutions: any[]): void {
    // Evaporate pheromones
    Object.keys(aco.pheromoneMatrix).forEach(from => {
      Object.keys(aco.pheromoneMatrix[from]).forEach(to => {
        aco.pheromoneMatrix[from][to] *= (1 - aco.evaporationRate);
      });
    });

    // Add pheromones from solutions
    solutions.forEach(({ solution, fitness }) => {
      const deltaPheromone = fitness / aco.numAnts;

      for (let i = 0; i < solution.length - 1; i++) {
        const from = solution[i];
        const to = solution[i + 1];
        aco.pheromoneMatrix[from][to] += deltaPheromone;
      }
    });
  }

  private checkConvergence(solution: any): boolean {
    // Simple convergence check
    return solution.fitness > 500; // Arbitrary threshold
  }

  // Helper methods
  private initializeKnowledgeGraph(): void {
    // Initialize with domain knowledge
    this.knowledgeGraph.set('fraud_patterns', {
      related: ['velocity', 'geographic_anomaly', 'amount_anomaly'],
      confidence: 0.9
    });

    this.knowledgeGraph.set('velocity', {
      definition: 'High frequency of transactions',
      risk_level: 'medium',
      indicators: ['transactions_per_hour > 10', 'unique_locations > 3']
    });

    this.knowledgeGraph.set('geographic_anomaly', {
      definition: 'Transactions from unusual locations',
      risk_level: 'high',
      indicators: ['distance_from_usual > 1000km', 'time_between < 24h']
    });
  }

  private calculateCentrality(nodes: string[], edges: any[]): any {
    const centrality = {};
    nodes.forEach(node => {
      centrality[node] = edges.filter(e => e.from === node || e.to === node).length;
    });
    return centrality;
  }

  private clusterLocations(locations: string[]): string[] {
    // Simple clustering by region
    const regions = new Set(locations.map(loc => loc.split(',')[0]));
    return Array.from(regions);
  }

  private detectSuspiciousPatterns(graph: any): any[] {
    const patterns = [];

    graph.nodes.forEach(node => {
      const nodeEdges = graph.edges.filter(e => e.from === node);
      const transactionCount = nodeEdges.filter(e => e.label === 'performed_transaction').length;
      const uniqueLocations = new Set(nodeEdges.filter(e => e.label === 'location').map(e => e.to)).size;

      if (transactionCount > 20 && uniqueLocations > 5) {
        patterns.push({
          description: `Node ${node} shows suspicious activity: ${transactionCount} transactions across ${uniqueLocations} locations`,
          severity: 'high',
          recommendation: 'Flag as potential_fraud_ring_member'
        });
      }
    });

    return patterns;
  }

  private detectVelocityPatterns(nodes: any[]): any {
    const totalTransactions = nodes.reduce((sum, node) => sum + (node.transactionCount || 0), 0);
    const avgTransactions = totalTransactions / nodes.length;

    return {
      highVelocity: avgTransactions > 10,
      avgTransactions,
      totalTransactions
    };
  }

  private determineSeverity(confidence: number): string {
    if (confidence > 0.8) return 'high';
    if (confidence > 0.6) return 'medium';
    return 'low';
  }
}
