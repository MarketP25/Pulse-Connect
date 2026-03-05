import { Pool } from "pg";

export interface ReputationEvent {
  id: number;
  user_id: number;
  contract_id?: number;
  milestone_id?: number;
  dimensions: "quality" | "timeliness" | "communication";
  score: number; // 0..5
  weight: number; // 0..1
  created_at: Date;
}

export interface ReputationScore {
  user_id: number;
  overall_score: number;
  quality_score: number;
  timeliness_score: number;
  communication_score: number;
  total_events: number;
  last_updated: Date;
}

type ReputationRow = {
  dimensions: ReputationEvent["dimensions"];
  score: number | string;
  weight: number | string | null;
};

export class ReputationService {
  constructor(private db: Pool) {}

  async calculateReputationScore(userId: number): Promise<ReputationScore> {
    const result = await this.db.query(
      `
      SELECT dimensions, score, weight
      FROM reputation_events
      WHERE user_id = $1
      ORDER BY created_at DESC
      `,
      [userId]
    );

    const rows = (result.rows || []) as ReputationRow[];
    if (rows.length === 0) {
      return {
        user_id: userId,
        overall_score: 0,
        quality_score: 0,
        timeliness_score: 0,
        communication_score: 0,
        total_events: 0,
        last_updated: new Date(),
      };
    }

    const qualityScore = this.dimensionWeightedAverage(rows, "quality");
    const timelinessScore = this.dimensionWeightedAverage(rows, "timeliness");
    const communicationScore = this.dimensionWeightedAverage(rows, "communication");
    const overallScore = this.round2((qualityScore + timelinessScore + communicationScore) / 3);

    return {
      user_id: userId,
      overall_score: overallScore,
      quality_score: qualityScore,
      timeliness_score: timelinessScore,
      communication_score: communicationScore,
      total_events: rows.length,
      last_updated: new Date(),
    };
  }

  private dimensionWeightedAverage(
    rows: ReputationRow[],
    dimension: ReputationEvent["dimensions"]
  ): number {
    const filtered = rows.filter((row) => row.dimensions === dimension);
    if (filtered.length === 0) return 0;

    let weightedSum = 0;
    let weightSum = 0;
    for (const row of filtered) {
      const score = this.clamp(Number(row.score || 0), 0, 5);
      const weight = this.clamp(Number(row.weight ?? 1), 0, 1);
      weightedSum += score * weight;
      weightSum += weight;
    }

    if (weightSum <= 0) return 0;
    return this.round2(weightedSum / weightSum);
  }

  private round2(value: number): number {
    return Math.round(value * 100) / 100;
  }

  private clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
  }
}

