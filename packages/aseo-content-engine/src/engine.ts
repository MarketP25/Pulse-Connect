import { randomUUID } from "crypto";
import { AnswerEngineOptimizationLayer, QuestionAnswerBlock, RawContentInput } from "@pulsco/aseo-core";
import { buildPageSchemaBundle } from "@pulsco/seo-schema-engine";
import { ContentBatchResult, ContentGenerationRequest, GeneratedContentAsset } from "./types";
import { resolveLocaleTemplate } from "./templates";

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function buildDefaultQuestions(request: ContentGenerationRequest): string[] {
  const serviceLabel = request.service ?? request.topic;
  const location = request.city || request.country ? `${request.city ?? ""} ${request.country ?? ""}`.trim() : "global markets";

  return [
    `What makes ${serviceLabel} discoverable in AI answers`,
    `How does Pulsco optimize ${serviceLabel} for ${location}`,
    `Which schema improves citation quality for ${serviceLabel}`
  ];
}

function buildAnswerBlocks(
  request: ContentGenerationRequest,
  questions: string[]
): { sections: QuestionAnswerBlock[]; faqs: QuestionAnswerBlock[] } {
  const template = resolveLocaleTemplate(request.language);

  const sections: QuestionAnswerBlock[] = questions.slice(0, 4).map((question, index) => ({
    question,
    shortAnswer: `${template.shortAnswerLead}: Pulsco structures ${request.primaryKeyword} with concise answer blocks and clean schema.`,
    explanation: `${template.explanationLead}: Section ${index + 1} adds entity-rich depth without reducing extraction clarity.`
  }));

  const faqs: QuestionAnswerBlock[] = questions.slice(0, 4).map((question, index) => ({
    question: `${template.faqLead} ${index + 1}: ${question}`,
    shortAnswer: `Pulsco aligns ${request.primaryKeyword} with answer-first formatting and region-aware relevance.`,
    explanation: `Each FAQ includes retrieval-friendly phrasing to increase citation probability in AI systems.`
  }));

  return { sections, faqs };
}

function buildDirectAnswer(request: ContentGenerationRequest): string {
  const template = resolveLocaleTemplate(request.language);
  const location = request.city || request.country ? `${request.city ?? ""} ${request.country ?? ""}`.trim() : "global audiences";

  return `${template.directAnswerLead}. Pulsco deploys ${request.primaryKeyword} content in ${location} with structured schema and region-aware entity coverage. The result is stronger ranking, answer extraction, and citation presence across modern AI discovery surfaces.`;
}

function buildEntitySection(request: ContentGenerationRequest): string {
  if (request.entities.length === 0) {
    return "";
  }

  const template = resolveLocaleTemplate(request.language);
  const lines: string[] = [];
  lines.push("## Entity Coverage");
  lines.push("");

  for (const entity of request.entities) {
    lines.push(`- ${template.entityLead}: ${entity}`);
  }

  return lines.join("\n");
}

function buildSchema(request: ContentGenerationRequest, questions: string[]) {
  return buildPageSchemaBundle({
    organization: {
      name: "Pulsco Global Ltd",
      url: "https://pulsco.global",
      sameAs: [
        "https://github.com/MarketP25/Pulsco",
        "https://www.linkedin.com/company/pulsco-global"
      ],
      description: "Planetary digital discovery infrastructure for SEO, AEO, GEO, and LLMO."
    },
    product:
      request.kind === "landing" || request.kind === "blog"
        ? {
            name: request.service ?? request.topic,
            description: `AI-ready discovery services for ${request.primaryKeyword}`,
            brand: "Pulsco",
            category: "Digital Services Platform"
          }
        : undefined,
    faqItems: questions.slice(0, 5).map((question) => ({
      question,
      answer: `Pulsco uses answer-first architecture for ${request.primaryKeyword} with schema-first publishing.`
    })),
    localBusiness:
      request.kind === "location"
        ? {
            name: "Pulsco Global Ltd",
            url: "https://pulsco.global",
            address: {
              addressLocality: request.city ?? "Unknown",
              addressCountry: request.country ?? "Unknown"
            }
          }
        : undefined,
    review: {
      itemName: request.service ?? request.topic,
      reviewer: "Pulsco Client",
      reviewBody: "Structured SEO + AEO delivery improved AI citations and qualified demand.",
      ratingValue: 5
    }
  });
}

export class ASEOContentEngine {
  private readonly answerOptimization = new AnswerEngineOptimizationLayer();

  generate(request: ContentGenerationRequest): GeneratedContentAsset {
    const questions = request.questions && request.questions.length > 0
      ? request.questions
      : buildDefaultQuestions(request);

    const { sections, faqs } = buildAnswerBlocks(request, questions);

    const rawContent: RawContentInput = {
      topic: request.topic,
      directAnswer: buildDirectAnswer(request),
      blocks: sections,
      faqs,
      primaryKeyword: request.primaryKeyword
    };

    const optimized = this.answerOptimization.optimize(rawContent);
    const markdown = [
      this.answerOptimization.toMarkdown(optimized),
      "",
      buildEntitySection(request),
      "",
      request.ctaUrl ? `## Next Step\n\nExplore: ${request.ctaUrl}` : ""
    ]
      .filter(Boolean)
      .join("\n")
      .trim();

    return {
      id: randomUUID(),
      kind: request.kind,
      locale: request.language,
      slug: slugify(request.topic),
      title: request.topic,
      markdown,
      optimized,
      schema: buildSchema(request, questions),
      entities: [...new Set(request.entities)],
      extractabilityScore: optimized.extractabilityScore,
      createdAt: Date.now(),
      citationsReady: optimized.extractabilityScore >= 75
    };
  }

  generateBatch(requests: ContentGenerationRequest[]): ContentBatchResult {
    const generated: GeneratedContentAsset[] = [];
    const failed: Array<{ request: ContentGenerationRequest; reason: string }> = [];

    for (const request of requests) {
      try {
        generated.push(this.generate(request));
      } catch (error) {
        failed.push({
          request,
          reason: error instanceof Error ? error.message : "unknown generation error"
        });
      }
    }

    return { generated, failed };
  }
}
