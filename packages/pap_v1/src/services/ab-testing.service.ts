import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, MoreThan } from "typeorm";
import { ActionEntity } from "../entities/action.entity";
import { CampaignEntity } from "../entities/campaign.entity";

export interface ABTestVariant {
  id: string;
  name: string;
  description?: string;
  content: {
    subject?: string;
    body: string;
    attachments?: string[];
  };
  targeting?: {
    audienceSegment?: string;
    channel?: string;
    geographic?: string[];
  };
  weight: number; // Percentage of traffic (0-100)
}

export interface ABTest {
  id: string;
  name: string;
  description?: string;
  campaignId: string;
  status: "draft" | "running" | "paused" | "completed" | "cancelled";
  testType: "content" | "timing" | "audience" | "channel" | "creative";
  variants: ABTestVariant[];
  controlVariantId?: string;
  startDate?: Date;
  endDate?: Date;
  targetSampleSize: number;
  confidenceThreshold: number; // 0.95 for 95% confidence
  primaryMetric: "open_rate" | "click_rate" | "conversion_rate" | "revenue";
  secondaryMetrics?: string[];
  winnerSelectionCriteria: "statistical_significance" | "minimum_improvement" | "revenue_impact";
  minimumImprovement?: number; // Minimum improvement percentage
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ABTestResults {
  testId: string;
  testName: string;
  status: string;
  totalSampleSize: number;
  variants: Array<{
    variantId: string;
    variantName: string;
    sampleSize: number;
    metrics: {
      openRate: number;
      clickRate: number;
      conversionRate: number;
      revenue: number;
      cost: number;
      roi: number;
    };
    confidence: number;
    statisticalSignificance: number;
    improvement: number; // Percentage improvement over control
  }>;
  winner?: {
    variantId: string;
    variantName: string;
    confidence: number;
    improvement: number;
    reason: string;
  };
  statisticalSummary: {
    overallSignificance: number;
    minimumDetectableEffect: number;
    testDuration: number; // Days
    remainingSampleSize?: number;
  };
  recommendations: string[];
}

export interface ABTestInsights {
  optimalVariant: string;
  confidenceLevel: number;
  expectedUplift: number;
  riskAssessment: "low" | "medium" | "high";
  implementationRecommendations: string[];
  followUpTests: Array<{
    testType: string;
    description: string;
    priority: "high" | "medium" | "low";
  }>;
}

@Injectable()
export class ABTestingService {
  private readonly logger = new Logger(ABTestingService.name);

  constructor(
    @InjectRepository(ActionEntity)
    private readonly actionRepository: Repository<ActionEntity>,
    @InjectRepository(CampaignEntity)
    private readonly campaignRepository: Repository<CampaignEntity>
  ) {}

  /**
   * Create a new A/B test
   */
  async createABTest(test: Omit<ABTest, "id" | "createdAt" | "updatedAt">): Promise<ABTest> {
    // Validate test configuration
    this.validateABTest(test);

    const testEntity = {
      ...test,
      id: this.generateTestId(),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // In a real implementation, save to database
    this.logger.log(`Created A/B test: ${testEntity.id} - ${testEntity.name}`);

    return testEntity;
  }

  /**
   * Start an A/B test
   */
  async startABTest(testId: string): Promise<ABTest> {
    // In a real implementation, update test status and start date
    this.logger.log(`Started A/B test: ${testId}`);

    return {
      id: testId,
      name: "Mock Test",
      campaignId: "campaign_123",
      status: "running",
      testType: "content",
      variants: [],
      targetSampleSize: 10000,
      confidenceThreshold: 0.95,
      primaryMetric: "open_rate",
      winnerSelectionCriteria: "statistical_significance",
      createdBy: "admin",
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }

  /**
   * Get A/B test results
   */
  async getABTestResults(testId: string): Promise<ABTestResults> {
    // Mock results - in real implementation, calculate from action data
    const variants = [
      {
        variantId: "variant_a",
        variantName: "Control Subject Line",
        sampleSize: 5000,
        metrics: {
          openRate: 0.245,
          clickRate: 0.032,
          conversionRate: 0.008,
          revenue: 1200,
          cost: 50,
          roi: 23.0
        },
        confidence: 0.95,
        statisticalSignificance: 0.99,
        improvement: 0 // Baseline
      },
      {
        variantId: "variant_b",
        variantName: "Personalized Subject",
        sampleSize: 5000,
        metrics: {
          openRate: 0.312,
          clickRate: 0.045,
          conversionRate: 0.012,
          revenue: 1800,
          cost: 50,
          roi: 35.0
        },
        confidence: 0.95,
        statisticalSignificance: 0.99,
        improvement: 27.3 // 27.3% improvement over control
      },
      {
        variantId: "variant_c",
        variantName: "Urgency Subject",
        sampleSize: 5000,
        metrics: {
          openRate: 0.278,
          clickRate: 0.038,
          conversionRate: 0.009,
          revenue: 1350,
          cost: 50,
          roi: 26.0
        },
        confidence: 0.95,
        statisticalSignificance: 0.99,
        improvement: 13.5
      }
    ];

    const winner = variants.find((v) => v.variantId === "variant_b");

    return {
      testId,
      testName: "Subject Line Optimization Test",
      status: "completed",
      totalSampleSize: 15000,
      variants,
      winner: winner
        ? {
            variantId: winner.variantId,
            variantName: winner.variantName,
            confidence: winner.confidence,
            improvement: winner.improvement,
            reason: "Highest statistical significance and revenue impact"
          }
        : undefined,
      statisticalSummary: {
        overallSignificance: 0.99,
        minimumDetectableEffect: 0.02,
        testDuration: 14
      },
      recommendations: [
        "Implement Variant B as the winning subject line",
        "Consider testing personalized content in email body",
        "Monitor performance for 2 weeks post-implementation"
      ]
    };
  }

  /**
   * Generate AI-powered insights for A/B test optimization
   */
  async generateABTestInsights(testId: string): Promise<ABTestInsights> {
    const results = await this.getABTestResults(testId);

    // Mock AI insights
    return {
      optimalVariant: results.winner?.variantId || "variant_a",
      confidenceLevel: results.winner?.confidence || 0.95,
      expectedUplift: results.winner?.improvement || 0,
      riskAssessment: "low",
      implementationRecommendations: [
        "Roll out winning variant to 100% of audience",
        "Monitor key metrics for 2 weeks post-implementation",
        "Consider follow-up test with email body personalization",
        "Document insights for future campaign optimization"
      ],
      followUpTests: [
        {
          testType: "content",
          description: "Test personalized email content blocks",
          priority: "high"
        },
        {
          testType: "timing",
          description: "Optimize send time based on user behavior",
          priority: "medium"
        },
        {
          testType: "audience",
          description: "Test different audience segmentation strategies",
          priority: "medium"
        }
      ]
    };
  }

  /**
   * Get recommended A/B test configurations for a campaign
   */
  async getRecommendedTests(campaignId: string): Promise<
    Array<{
      testType: string;
      name: string;
      description: string;
      estimatedImpact: number;
      difficulty: "easy" | "medium" | "hard";
      estimatedDuration: number; // Days
    }>
  > {
    // Mock recommendations based on campaign type and historical data
    return [
      {
        testType: "content",
        name: "Subject Line Variations",
        description: "Test different subject lines to improve open rates",
        estimatedImpact: 0.25,
        difficulty: "easy",
        estimatedDuration: 7
      },
      {
        testType: "creative",
        name: "Email Design Elements",
        description: "Test different layouts, images, and call-to-action buttons",
        estimatedImpact: 0.18,
        difficulty: "medium",
        estimatedDuration: 14
      },
      {
        testType: "timing",
        name: "Send Time Optimization",
        description: "Test different days and times for email delivery",
        estimatedImpact: 0.15,
        difficulty: "easy",
        estimatedDuration: 10
      },
      {
        testType: "audience",
        name: "Audience Segmentation",
        description: "Test different audience segments for targeted messaging",
        estimatedImpact: 0.3,
        difficulty: "hard",
        estimatedDuration: 21
      }
    ];
  }

  /**
   * Calculate statistical significance between variants
   */
  private calculateStatisticalSignificance(
    variantA: { sampleSize: number; conversions: number },
    variantB: { sampleSize: number; conversions: number }
  ): number {
    // Simplified statistical significance calculation
    // In real implementation, use proper statistical tests (chi-square, t-test, etc.)

    const rateA = variantA.conversions / variantA.sampleSize;
    const rateB = variantB.conversions / variantB.sampleSize;

    // Simple z-test approximation
    const pooledRate =
      (variantA.conversions + variantB.conversions) / (variantA.sampleSize + variantB.sampleSize);

    if (pooledRate === 0 || pooledRate === 1) return 0;

    const se = Math.sqrt(
      pooledRate * (1 - pooledRate) * (1 / variantA.sampleSize + 1 / variantB.sampleSize)
    );

    const zScore = Math.abs(rateA - rateB) / se;

    // Convert z-score to p-value (simplified)
    // For z > 1.96, p < 0.05 (95% confidence)
    // For z > 2.58, p < 0.01 (99% confidence)

    if (zScore > 2.58) return 0.99;
    if (zScore > 1.96) return 0.95;
    return 0.8; // Some significance but not strong
  }

  /**
   * Validate A/B test configuration
   */
  private validateABTest(test: Omit<ABTest, "id" | "createdAt" | "updatedAt">): void {
    if (!test.name || test.name.length < 3) {
      throw new Error("Test name must be at least 3 characters");
    }

    if (!test.variants || test.variants.length < 2) {
      throw new Error("A/B test must have at least 2 variants");
    }

    const totalWeight = test.variants.reduce((sum, variant) => sum + variant.weight, 0);
    if (Math.abs(totalWeight - 100) > 0.1) {
      throw new Error("Variant weights must sum to 100%");
    }

    if (test.confidenceThreshold < 0.8 || test.confidenceThreshold > 0.99) {
      throw new Error("Confidence threshold must be between 0.8 and 0.99");
    }

    if (test.targetSampleSize < 1000) {
      throw new Error("Target sample size must be at least 1000");
    }
  }

  /**
   * Generate unique test ID
   */
  private generateTestId(): string {
    return `ab_test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Allocate user to test variant based on weights
   */
  allocateVariant(test: ABTest, userId: string): ABTestVariant {
    // Simple hash-based allocation for consistency
    const hash = this.simpleHash(userId + test.id);
    const randomValue = (hash % 100) / 100;

    let cumulativeWeight = 0;
    for (const variant of test.variants) {
      cumulativeWeight += variant.weight / 100;
      if (randomValue <= cumulativeWeight) {
        return variant;
      }
    }

    // Fallback to first variant
    return test.variants[0];
  }

  /**
   * Simple hash function for consistent user allocation
   */
  private simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  /**
   * Get A/B testing best practices and guidelines
   */
  getTestingGuidelines(): {
    general: string[];
    statistical: string[];
    implementation: string[];
  } {
    return {
      general: [
        "Test one variable at a time to isolate impact",
        "Ensure adequate sample size for statistical significance",
        "Run tests for sufficient duration to capture different user behaviors",
        "Consider seasonal effects and external factors",
        "Document test hypotheses and success criteria upfront"
      ],
      statistical: [
        "Aim for 95% confidence level for most tests",
        "Ensure minimum detectable effect is practical",
        "Monitor for statistical significance, not just percentage differences",
        "Consider both statistical and practical significance",
        "Use proper statistical tests for your data type"
      ],
      implementation: [
        "Implement proper randomization to avoid bias",
        "Ensure consistent user experience across variants",
        "Monitor system performance during testing",
        "Have a rollback plan for failed tests",
        "Communicate test results and learnings to the team"
      ]
    };
  }
}
