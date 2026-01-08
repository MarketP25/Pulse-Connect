import { Pool } from 'pg';

export interface ReputationEvent {
  id: number;
  user_id: number;
  contract_id?: number;
  milestone_id?: number;
  dimensions: 'quality' | 'timeliness' | 'communication';
  score: number; // 0-5 scale
  weight: number;
  created_at: Date;
}

export interface ReputationScore {
  user_id: number;
  overall_score: number;
  quality_score: number;
