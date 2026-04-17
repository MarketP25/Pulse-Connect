import { AnswerOptimizedDocument } from "@pulsco/aseo-core";
import { PageSchemaBundle } from "@pulsco/seo-schema-engine";

export type ContentKind = "blog" | "landing" | "faq" | "location";

export interface ContentGenerationRequest {
  kind: ContentKind;
  topic: string;
  primaryKeyword: string;
  service?: string;
  city?: string;
  country?: string;
  language: string;
  entities: string[];
  questions?: string[];
  audience?: string;
  ctaUrl?: string;
}

export interface GeneratedContentAsset {
  id: string;
  kind: ContentKind;
  locale: string;
  slug: string;
  title: string;
  markdown: string;
  optimized: AnswerOptimizedDocument;
  schema: PageSchemaBundle;
  entities: string[];
  extractabilityScore: number;
  createdAt: number;
  citationsReady: boolean;
}

export interface ContentBatchResult {
  generated: GeneratedContentAsset[];
  failed: Array<{ request: ContentGenerationRequest; reason: string }>;
}
