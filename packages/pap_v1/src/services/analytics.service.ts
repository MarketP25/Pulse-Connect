import { Injectable, Logger } from '@nestjs/common';

export interface CampaignAnalytics {
  campaignId: string;
  impressions: number;
  clicks: number;
  conversions: number;
  ctr: number;
  cvr: number;
  costPerClick: number;
  costPerConversion: number;
  totalSpend: number;
  roi: number;
  timeRange: {
    start: Date;
    end: Date;
  };
}

export interface ProximityAnalytics {
  locationId: string;
  radius: number;
  userDensity: number;
  engagementRate: number;
  conversionRate: number;
  avgDwellTime: number;
  peakHours: number[];
  demographics: {
    ageGroups: Record<string, number>;
    interests: Record<string, number>;
  };
}

export interface AITestResults {
  testId: string;
  variantA: {
    content: string;
    impressions: number;
    conversions: number;
    confidence: number;
  };
  variantB: {
    content: string;
    impressions: number;
    conversions: number;
    confidence: number;
  };
  winner: 'A' | 'B' | 'tie';
  statisticalSignificance: number;
  improvement: number;
  recommendations: string[];
}

export interface AITargetingInsights {
  recommendedAudiences: Array<{
    name: string;
    size: number;
    expectedEngagement: number;
    confidence: number;
    targetingCriteria: Record<string, string | number | boolean>;
  }>;
  optimalTiming: Array<{
    hour: number;
    dayOfWeek: number;
    expectedPerformance: number;
  }>;
  contentOptimization: Array<{
    contentType: string;
    recommendedVariations: string[];
    expectedImprovement: number;
  }>;
  churnPrediction: Array<{
    userSegment: string;
    churnRisk: number;
    recommendedActions: string[];
  }>;
}

export interface PAPAnalyticsSummary {
  totalCampaigns: number;
  activeCampaigns: number;
  totalActionsSent: number;
  totalDeliveries: number;
  overallOpenRate: number;
  overallClickRate: number;
  overallConversionRate: number;
  totalRevenue: number;
  totalCost: number;
  overallROI: number;
  topPerformingCampaigns: Array<{
    campaignId: string;
    campaignName: string;
    roi: number;
    revenue: number;
  }>;
  channelPerformance: Array<{
    channel: string;
    actions: number;
    deliveryRate: number;
    engagementRate: number;
    costPerAction: number;
  }>;
  consentMetrics: {
    totalConsents: number;
    activeConsents: number;
    consentByChannel: number;
    consentByPurpose: number;
    consentRevocationRate: number;
  };
  subscriptionMetrics: {
    totalSubscriptions: number;
    activeSubscriptions: number;
    avgEntitlementsPerUser: number;
    topEntitlements: Array<{
      entitlement: string;
      usage: number;
      users: number;
    }>;
  };
}

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  private stableSeed(input: string): number {
    let hash = 0;
    for (let i = 0; i < input.length; i += 1) {
      hash = (hash * 31 + input.charCodeAt(i)) >>> 0;
    }
    return hash;
  }

  private range(seed: number, min: number, max: number): number {
    const normalized = (seed % 10_000) / 10_000;
    return min + normalized * (max - min);
  }

  private pct(value: number): number {
    return Number(value.toFixed(4));
  }

  async getCampaignAnalytics(
    campaignId: string,
    timeRange: { start: Date; end: Date },
    granularity: 'hour' | 'day' | 'week' | 'month' = 'day'
  ): Promise<
    CampaignAnalytics & {
      insights: string[];
      predictions: {
        nextWeekPerformance: number;
        optimalBudget: number;
        bestTimeToRun: string[];
      };
      anomalies: Array<{
        type: string;
        description: string;
        impact: number;
        timestamp: Date;
      }>;
    }
  > {
    this.logger.log(
      `Generating campaign analytics for ${campaignId} with granularity=${granularity}`
    );

    const seed = this.stableSeed(`${campaignId}:${timeRange.start.toISOString()}:${timeRange.end.toISOString()}`);
    const impressions = Math.round(this.range(seed, 20_000, 100_000));
    const clicks = Math.round(impressions * this.range(seed + 11, 0.03, 0.18));
    const conversions = Math.round(clicks * this.range(seed + 23, 0.04, 0.3));
    const totalSpend = this.range(seed + 31, 500, 8_000);
    const revenue = conversions * this.range(seed + 41, 18, 95);

    const ctr = impressions > 0 ? clicks / impressions : 0;
    const cvr = clicks > 0 ? conversions / clicks : 0;

    const analytics: CampaignAnalytics = {
      campaignId,
      impressions,
      clicks,
      conversions,
      ctr: this.pct(ctr),
      cvr: this.pct(cvr),
      costPerClick: clicks > 0 ? this.pct(totalSpend / clicks) : 0,
      costPerConversion: conversions > 0 ? this.pct(totalSpend / conversions) : 0,
      totalSpend: Number(totalSpend.toFixed(2)),
      roi: totalSpend > 0 ? this.pct((revenue - totalSpend) / totalSpend) : 0,
      timeRange
    };

    return {
      ...analytics,
      insights: [
        'Highest incremental lift comes from personalized call-to-action variants.',
        'Peak engagement clusters around weekday midday windows.',
        'Retargeting cohorts outperform broad acquisition cohorts in this period.'
      ],
      predictions: {
        nextWeekPerformance: this.pct(this.range(seed + 61, -0.08, 0.22)),
        optimalBudget: Number((totalSpend * this.range(seed + 67, 0.9, 1.35)).toFixed(2)),
        bestTimeToRun: ['Tue 11:00', 'Wed 14:00', 'Thu 10:00']
      },
      anomalies: [
        {
          type: 'engagement_spike',
          description: 'Brief click-through surge detected in a high-intent cohort.',
          impact: this.pct(this.range(seed + 73, 0.08, 0.31)),
          timestamp: new Date()
        }
      ]
    };
  }

  async getProximityAnalytics(
    locationId: string,
    radius = 1000,
    timeRange: { start: Date; end: Date }
  ): Promise<
    ProximityAnalytics & {
      heatmaps: {
        engagement: Record<string, unknown>;
        conversion: Record<string, unknown>;
        dwellTime: Record<string, unknown>;
      };
      optimalPlacement: {
        coordinates: [number, number];
        expectedEngagement: number;
        confidence: number;
      };
      competitorAnalysis: Array<{
        competitorId: string;
        proximity: number;
        marketShare: number;
        threatLevel: 'low' | 'medium' | 'high';
      }>;
    }
  > {
    const seed = this.stableSeed(`${locationId}:${radius}:${timeRange.start.toISOString()}`);

    const base: ProximityAnalytics = {
      locationId,
      radius,
      userDensity: Number(this.range(seed + 5, 120, 2400).toFixed(2)),
      engagementRate: this.pct(this.range(seed + 7, 0.08, 0.42)),
      conversionRate: this.pct(this.range(seed + 9, 0.01, 0.17)),
      avgDwellTime: Number(this.range(seed + 13, 26, 390).toFixed(2)),
      peakHours: [9, 12, 17, 20],
      demographics: {
        ageGroups: {
          '18-24': 0.18,
          '25-34': 0.32,
          '35-44': 0.24,
          '45-54': 0.16,
          '55+': 0.1
        },
        interests: {
          retail: 0.29,
          food: 0.21,
          travel: 0.18,
          technology: 0.14,
          fitness: 0.18
        }
      }
    };

    return {
      ...base,
      heatmaps: {
        engagement: { type: 'FeatureCollection', features: [] },
        conversion: { type: 'FeatureCollection', features: [] },
        dwellTime: { type: 'FeatureCollection', features: [] }
      },
      optimalPlacement: {
        coordinates: [
          Number(this.range(seed + 17, -180, 180).toFixed(6)),
          Number(this.range(seed + 19, -85, 85).toFixed(6))
        ],
        expectedEngagement: this.pct(this.range(seed + 21, 0.1, 0.6)),
        confidence: this.pct(this.range(seed + 25, 0.72, 0.97))
      },
      competitorAnalysis: [
        {
          competitorId: `cmp_${seed % 1000}_a`,
          proximity: Math.round(this.range(seed + 29, 60, radius * 1.2)),
          marketShare: this.pct(this.range(seed + 31, 0.08, 0.3)),
          threatLevel: 'high'
        },
        {
          competitorId: `cmp_${seed % 1000}_b`,
          proximity: Math.round(this.range(seed + 37, 150, radius * 1.8)),
          marketShare: this.pct(this.range(seed + 41, 0.05, 0.2)),
          threatLevel: 'medium'
        }
      ]
    };
  }

  async getPAPAnalyticsSummary(startDate: Date, endDate: Date): Promise<PAPAnalyticsSummary> {
    const seed = this.stableSeed(`${startDate.toISOString()}:${endDate.toISOString()}`);
    const totalCampaigns = Math.round(this.range(seed + 101, 45, 220));
    const activeCampaigns = Math.round(totalCampaigns * this.range(seed + 103, 0.35, 0.82));
    const totalActionsSent = Math.round(this.range(seed + 107, 20_000, 1_200_000));
    const totalDeliveries = Math.round(totalActionsSent * this.range(seed + 109, 0.74, 0.97));
    const totalRevenue = Number(this.range(seed + 113, 50_000, 900_000).toFixed(2));
    const totalCost = Number(this.range(seed + 127, 8_000, 220_000).toFixed(2));

    return {
      totalCampaigns,
      activeCampaigns,
      totalActionsSent,
      totalDeliveries,
      overallOpenRate: this.pct(this.range(seed + 131, 0.15, 0.56)),
      overallClickRate: this.pct(this.range(seed + 137, 0.03, 0.28)),
      overallConversionRate: this.pct(this.range(seed + 139, 0.006, 0.12)),
      totalRevenue,
      totalCost,
      overallROI: totalCost > 0 ? this.pct((totalRevenue - totalCost) / totalCost) : 0,
      topPerformingCampaigns: [
        {
          campaignId: `cmp_${seed % 10_000}_1`,
          campaignName: 'Global Launch Sequence',
          roi: this.pct(this.range(seed + 149, 0.9, 4.4)),
          revenue: Number(this.range(seed + 151, 9_000, 110_000).toFixed(2))
        },
        {
          campaignId: `cmp_${seed % 10_000}_2`,
          campaignName: 'Retention Boost Program',
          roi: this.pct(this.range(seed + 157, 0.8, 3.8)),
          revenue: Number(this.range(seed + 163, 7_000, 95_000).toFixed(2))
        }
      ],
      channelPerformance: [
        {
          channel: 'email',
          actions: Math.round(totalActionsSent * 0.46),
          deliveryRate: this.pct(this.range(seed + 167, 0.88, 0.99)),
          engagementRate: this.pct(this.range(seed + 173, 0.2, 0.58)),
          costPerAction: 0.008
        },
        {
          channel: 'push',
          actions: Math.round(totalActionsSent * 0.31),
          deliveryRate: this.pct(this.range(seed + 179, 0.86, 0.99)),
          engagementRate: this.pct(this.range(seed + 181, 0.09, 0.33)),
          costPerAction: 0.003
        },
        {
          channel: 'sms',
          actions: Math.round(totalActionsSent * 0.23),
          deliveryRate: this.pct(this.range(seed + 191, 0.82, 0.97)),
          engagementRate: this.pct(this.range(seed + 193, 0.07, 0.27)),
          costPerAction: 0.019
        }
      ],
      consentMetrics: {
        totalConsents: Math.round(this.range(seed + 197, 12_000, 270_000)),
        activeConsents: Math.round(this.range(seed + 199, 10_000, 210_000)),
        consentByChannel: 3,
        consentByPurpose: 5,
        consentRevocationRate: this.pct(this.range(seed + 211, 0.01, 0.14))
      },
      subscriptionMetrics: {
        totalSubscriptions: Math.round(this.range(seed + 223, 8_000, 140_000)),
        activeSubscriptions: Math.round(this.range(seed + 227, 7_000, 112_000)),
        avgEntitlementsPerUser: Number(this.range(seed + 229, 1.8, 5.6).toFixed(2)),
        topEntitlements: [
          { entitlement: 'email_marketing', usage: 85, users: 12_500 },
          { entitlement: 'sms_notifications', usage: 72, users: 8_900 },
          { entitlement: 'push_alerts', usage: 68, users: 15_600 }
        ]
      }
    };
  }

  async generateAITargetingInsights(
    _campaignId?: string,
    userSegment?: string
  ): Promise<AITargetingInsights> {
    const segment = userSegment || 'all-users';

    return {
      recommendedAudiences: [
        {
          name: 'High-Intent Repeat Visitors',
          size: 12_500,
          expectedEngagement: 0.35,
          confidence: 0.89,
          targetingCriteria: {
            segment,
            purchaseHistory: 'premium',
            recencyDays: '<30'
          }
        },
        {
          name: 'Dormant Reactivation Cohort',
          size: 9_200,
          expectedEngagement: 0.21,
          confidence: 0.8,
          targetingCriteria: {
            segment,
            inactivityDays: '>60',
            priorEngagement: 'medium-high'
          }
        }
      ],
      optimalTiming: [
        { hour: 10, dayOfWeek: 2, expectedPerformance: 0.31 },
        { hour: 14, dayOfWeek: 3, expectedPerformance: 0.29 },
        { hour: 18, dayOfWeek: 4, expectedPerformance: 0.27 }
      ],
      contentOptimization: [
        {
          contentType: 'email',
          recommendedVariations: [
            'Value-led subject line',
            'Dynamic social proof block',
            'Personalized CTA copy'
          ],
          expectedImprovement: 0.24
        },
        {
          contentType: 'push',
          recommendedVariations: [
            'Contextual location prompts',
            'Time-window urgency copy'
          ],
          expectedImprovement: 0.17
        }
      ],
      churnPrediction: [
        {
          userSegment: 'Trial users week 2',
          churnRisk: 0.58,
          recommendedActions: [
            'Lifecycle educational journey',
            'Feature completion nudges',
            'Guided concierge outreach'
          ]
        },
        {
          userSegment: 'Low-frequency purchasers',
          churnRisk: 0.43,
          recommendedActions: [
            'Value reminder campaign',
            'Personalized win-back incentive'
          ]
        }
      ]
    };
  }

  async getABTestResults(campaignId: string): Promise<{
    testId: string;
    testName: string;
    variants: Array<{
      variantId: string;
      name: string;
      sampleSize: number;
      conversionRate: number;
      confidence: number;
      isWinner: boolean;
    }>;
    statisticalSignificance: number;
    recommendedWinner: string;
  }> {
    const seed = this.stableSeed(campaignId);
    const aRate = this.range(seed + 251, 0.018, 0.05);
    const bRate = this.range(seed + 257, 0.02, 0.056);
    const cRate = this.range(seed + 263, 0.017, 0.052);
    const winner = [
      { id: 'variant_a', rate: aRate },
      { id: 'variant_b', rate: bRate },
      { id: 'variant_c', rate: cRate }
    ].sort((left, right) => right.rate - left.rate)[0];

    return {
      testId: `ab_${campaignId.slice(0, 8)}`,
      testName: 'Creative Messaging Optimization',
      variants: [
        {
          variantId: 'variant_a',
          name: 'Control',
          sampleSize: 5_000,
          conversionRate: this.pct(aRate),
          confidence: 0.95,
          isWinner: winner.id === 'variant_a'
        },
        {
          variantId: 'variant_b',
          name: 'Personalized CTA',
          sampleSize: 5_000,
          conversionRate: this.pct(bRate),
          confidence: 0.95,
          isWinner: winner.id === 'variant_b'
        },
        {
          variantId: 'variant_c',
          name: 'Urgency Variant',
          sampleSize: 5_000,
          conversionRate: this.pct(cRate),
          confidence: 0.95,
          isWinner: winner.id === 'variant_c'
        }
      ],
      statisticalSignificance: 0.99,
      recommendedWinner: winner.id
    };
  }

  async exportAnalyticsData(
    startDate: Date,
    endDate: Date,
    format: 'json' | 'csv' | 'pdf' = 'json'
  ): Promise<unknown> {
    const analytics = await this.getPAPAnalyticsSummary(startDate, endDate);

    switch (format) {
      case 'json':
        return analytics;
      case 'csv':
        return this.convertToCSV(analytics);
      case 'pdf':
        return this.generatePDFReport(analytics);
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }

  private convertToCSV(data: PAPAnalyticsSummary): string {
    const entries = Object.entries(data)
      .filter(([, value]) => typeof value !== 'object')
      .map(([key, value]) => `${key},${String(value)}`);

    return ['metric,value', ...entries].join('\n');
  }

  private generatePDFReport(data: PAPAnalyticsSummary): Buffer {
    return Buffer.from(JSON.stringify(data, null, 2), 'utf8');
  }
}
