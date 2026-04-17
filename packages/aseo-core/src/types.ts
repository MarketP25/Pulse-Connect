export type SearchIntent = "transactional" | "informational" | "navigational";

export interface KeywordSignal {
  keyword: string;
  region: string;
  language: string;
  source: "search-trend" | "csi-query" | "first-party-analytics";
  volume: number;
  momentum: number;
  difficulty?: number;
  timestamp: number;
}

export interface KeywordInsight {
  keyword: string;
  region: string;
  language: string;
  intent: SearchIntent;
  totalVolume: number;
  momentum: number;
  opportunityScore: number;
  entities: string[];
  sourceBlend: Array<KeywordSignal["source"]>;
}

export interface IntentCluster {
  intent: SearchIntent;
  keywords: KeywordInsight[];
  aggregateVolume: number;
  avgOpportunity: number;
}

export interface QuestionAnswerBlock {
  question: string;
  shortAnswer: string;
  explanation: string;
}

export interface RawContentInput {
  topic: string;
  directAnswer: string;
  blocks: QuestionAnswerBlock[];
  faqs: QuestionAnswerBlock[];
  primaryKeyword: string;
}

export interface AnswerOptimizedDocument {
  h1: string;
  directAnswer: string[];
  sections: QuestionAnswerBlock[];
  faqs: QuestionAnswerBlock[];
  extractabilityScore: number;
  chunkCount: number;
}

export interface HardRuleViolation {
  code:
    | "keyword_stuffing"
    | "duplicate_page"
    | "unstructured_content"
    | "missing_schema"
    | "missing_audit";
  message: string;
}

export interface HardRuleReport {
  passed: boolean;
  violations: HardRuleViolation[];
}
