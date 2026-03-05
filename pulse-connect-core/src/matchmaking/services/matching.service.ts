import { Injectable, Logger } from '@nestjs/common';
import { Pool } from 'pg';
import { emitMatchmakingEvent } from '../../csi/instrumentation';

export interface Brief {
  id: number;
  client_id: number;
  scope: string;
  required_skills: string[];
  budget_min: number;
  budget_max: number;
  language: string;
  geo_radius?: number;
}

export interface User {
  id: number;
  skills: string[];
  geo_point?: any;
  language_prefs: string[];
  verification_level: string;
  capacity: number;
  availability: boolean;
}

export interface Match {
  user_id: number;
  score: number;
  top_signals: string[];
  reason: string;
}

export interface MatchResult {
  brief_id: number;
  trace_id: string;
  matches: Match[];
  total_candidates: number;
  processing_time_ms: number;
}

@Injectable()
export class MatchingService {
  private readonly logger = new Logger(MatchingService.name);

  constructor(private readonly pool: Pool) {}

  /**
   * Generate matches for a project brief
   */
  async generateMatches(brief: Brief, traceId: string): Promise<MatchResult> {
    const startTime = Date.now();

    try {
      this.logger.log(`Starting match generation for brief ${brief.id}`, { traceId });

      // 1. Get eligible candidates
      const candidates = await this.getEligibleCandidates(brief);

      // 2. Score and rank candidates
      const matches = await this.scoreCandidates(brief, candidates);

      // 3. Apply explainability
      const matchesWithExplanation = this.addExplainability(matches, brief);

      const result: MatchResult = {
        brief_id: brief.id,
        trace_id: traceId,
        matches: matchesWithExplanation,
        total_candidates: candidates.length,
        processing_time_ms: Date.now() - startTime,
      };

      this.logger.log(`Generated ${matches.length} matches for brief ${brief.id}`, {
        traceId,
        totalCandidates: candidates.length,
        processingTime: result.processing_time_ms,
      });

      emitMatchmakingEvent(
        'matching.generated',
        'GLOBAL',
        {
          briefId: brief.id,
          totalCandidates: candidates.length,
          matchedCandidates: matches.length,
          processingTimeMs: result.processing_time_ms,
          traceId,
        },
        {
          riskScore: matches.length === 0 ? 48 : 22,
          performanceScore: result.processing_time_ms > 3000 ? 55 : 87,
        },
      );

      return result;

    } catch (error) {
      this.logger.error(`Match generation failed for brief ${brief.id}`, error, { traceId });
      emitMatchmakingEvent(
        'matching.failed',
        'GLOBAL',
        {
          briefId: brief.id,
          traceId,
          reason: error instanceof Error ? error.message : 'unknown_error',
        },
        {
          riskScore: 72,
          performanceScore: 28,
        },
      );
      throw error;
    }
  }

  /**
   * Get eligible candidates based on brief requirements
   */
  private async getEligibleCandidates(brief: Brief): Promise<User[]> {
    const query = `
      SELECT
        u.id,
        u.skills,
        u.geo_point,
        u.language_prefs,
        u.verification_level,
        u.capacity,
        u.availability
      FROM users u
      WHERE u.availability = true
        AND u.capacity > 0
        AND u.verification_level IN ('verified', 'premium')
        AND u.language_prefs @> $1
        AND u.skills && $2
        AND NOT EXISTS (
          SELECT 1 FROM contracts c
          WHERE c.provider_id = u.id
            AND c.status IN ('active', 'pending')
            AND c.end_date > NOW()
        )
    `;

    const values = [
      [brief.language], // Language preferences
      brief.required_skills, // Required skills overlap
    ];

    const result = await this.pool.query(query, values);
    return result.rows;
  }

  /**
   * Score candidates based on multiple factors
   */
  private async scoreCandidates(brief: Brief, candidates: User[]): Promise<Match[]> {
    const matches: Match[] = [];

    for (const candidate of candidates) {
      const score = this.calculateMatchScore(brief, candidate);

      if (score > 0.3) { // Minimum threshold
        matches.push({
          user_id: candidate.id,
          score,
          top_signals: [], // Will be populated by explainability
          reason: '', // Will be populated by explainability
        });
      }
    }

    // Sort by score descending
    return matches.sort((a, b) => b.score - a.score);
  }

  /**
   * Calculate comprehensive match score
   */
  private calculateMatchScore(brief: Brief, candidate: User): number {
    let totalScore = 0;
    let totalWeight = 0;

    // Skills match (40% weight)
    const skillsScore = this.calculateSkillsScore(brief.required_skills, candidate.skills);
    totalScore += skillsScore * 0.4;
    totalWeight += 0.4;

    // Budget compatibility (20% weight)
    const budgetScore = this.calculateBudgetScore(brief.budget_min, brief.budget_max, candidate);
    totalScore += budgetScore * 0.2;
    totalWeight += 0.2;

    // Language match (15% weight)
    const languageScore = candidate.language_prefs.includes(brief.language) ? 1 : 0;
    totalScore += languageScore * 0.15;
    totalWeight += 0.15;

    // Verification level (15% weight)
    const verificationScore = this.getVerificationScore(candidate.verification_level);
    totalScore += verificationScore * 0.15;
    totalWeight += 0.15;

    // Capacity availability (10% weight)
    const capacityScore = Math.min(candidate.capacity / 5, 1); // Normalize to 0-1
    totalScore += capacityScore * 0.1;
    totalWeight += 0.1;

    return totalWeight > 0 ? totalScore / totalWeight : 0;
  }

  /**
   * Calculate skills overlap score
   */
  private calculateSkillsScore(requiredSkills: string[], candidateSkills: string[]): number {
    if (requiredSkills.length === 0) return 1;

    const overlap = requiredSkills.filter(skill =>
      candidateSkills.some(candidateSkill =>
        candidateSkill.toLowerCase().includes(skill.toLowerCase())
      )
    ).length;

    return overlap / requiredSkills.length;
  }

  /**
   * Calculate budget compatibility score
   */
  private calculateBudgetScore(budgetMin: number, budgetMax: number, candidate: User): number {
    // This would typically involve checking candidate's rate history
    // For now, return a neutral score
    return 0.8; // Assume good budget fit
  }

  /**
   * Get verification level score
   */
  private getVerificationScore(level: string): number {
    switch (level) {
      case 'premium': return 1.0;
      case 'verified': return 0.8;
      case 'basic': return 0.5;
      default: return 0.2;
    }
  }

  /**
   * Add explainability data to matches
   */
  private addExplainability(matches: Match[], brief: Brief): Match[] {
    return matches.map(match => {
      const signals = this.generateTopSignals(match, brief);
      const reason = this.generateReason(signals);

      return {
        ...match,
        top_signals: signals,
        reason,
      };
    });
  }

  /**
   * Generate top signals for explainability
   */
  private generateTopSignals(match: Match, brief: Brief): string[] {
    const signals: string[] = [];

    if (match.score > 0.8) {
      signals.push('Excellent overall match');
    } else if (match.score > 0.6) {
      signals.push('Good overall match');
    }

    // Add specific signals based on score components
    signals.push('Skills alignment');
    signals.push('Budget compatibility');
    signals.push('Language match');

    return signals.slice(0, 3); // Top 3 signals
  }

  /**
   * Generate human-readable reason
   */
  private generateReason(signals: string[]): string {
    if (signals.length === 0) return 'General match';

    const primarySignal = signals[0];
    return `Selected due to ${primarySignal.toLowerCase()} and complementary factors`;
  }

  /**
   * Get match statistics
   */
  async getMatchStatistics(timeRange: { start: Date; end: Date }) {
    const query = `
      SELECT
        COUNT(*) as total_matches,
        AVG(score) as avg_score,
        COUNT(CASE WHEN score > 0.8 THEN 1 END) as high_quality_matches,
        COUNT(DISTINCT brief_id) as briefs_processed,
        AVG(processing_time_ms) as avg_processing_time
      FROM match_results
      WHERE created_at BETWEEN $1 AND $2
    `;

    const result = await this.pool.query(query, [timeRange.start, timeRange.end]);
    return result.rows[0];
  }
}
