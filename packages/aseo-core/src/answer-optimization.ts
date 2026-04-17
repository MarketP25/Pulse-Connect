import { AnswerOptimizedDocument, QuestionAnswerBlock, RawContentInput } from "./types";

function normalizeSentence(value: string): string {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return "";
  }

  if (/[.!?]$/.test(trimmed)) {
    return trimmed;
  }

  return `${trimmed}.`;
}

function splitIntoAnswerLines(answer: string): string[] {
  const sentences = answer
    .split(/(?<=[.!?])\s+/)
    .map((part) => part.trim())
    .filter(Boolean)
    .map(normalizeSentence);

  if (sentences.length >= 2 && sentences.length <= 3) {
    return sentences;
  }

  if (sentences.length > 3) {
    return sentences.slice(0, 3);
  }

  if (sentences.length === 1) {
    const words = sentences[0].split(/\s+/).filter(Boolean);
    const mid = Math.max(6, Math.floor(words.length / 2));
    const first = normalizeSentence(words.slice(0, mid).join(" "));
    const second = normalizeSentence(words.slice(mid).join(" "));
    return [first, second].filter((line) => line.length > 1);
  }

  return ["Pulsco delivers answer-first SEO and ASEO content optimized for citations."];
}

function normalizeBlock(block: QuestionAnswerBlock): QuestionAnswerBlock {
  const question = block.question.trim().endsWith("?")
    ? block.question.trim()
    : `${block.question.trim()}?`;

  return {
    question,
    shortAnswer: normalizeSentence(block.shortAnswer),
    explanation: normalizeSentence(block.explanation)
  };
}

function scoreExtractability(doc: AnswerOptimizedDocument): number {
  let score = 55;

  if (doc.directAnswer.length >= 2 && doc.directAnswer.length <= 3) {
    score += 15;
  }

  if (doc.sections.length >= 3) {
    score += 15;
  }

  if (doc.faqs.length >= 3) {
    score += 10;
  }

  const hasQuestionHeadings = doc.sections.every((section) => section.question.endsWith("?"));
  if (hasQuestionHeadings) {
    score += 5;
  }

  return Number(Math.max(0, Math.min(100, score)).toFixed(2));
}

export class AnswerEngineOptimizationLayer {
  optimize(input: RawContentInput): AnswerOptimizedDocument {
    const directAnswer = splitIntoAnswerLines(input.directAnswer);

    const sections = input.blocks.map(normalizeBlock);
    const faqs = input.faqs.map(normalizeBlock);

    const optimized: AnswerOptimizedDocument = {
      h1: input.topic.trim(),
      directAnswer,
      sections,
      faqs,
      extractabilityScore: 0,
      chunkCount: directAnswer.length + sections.length + faqs.length
    };

    optimized.extractabilityScore = scoreExtractability(optimized);
    return optimized;
  }

  toMarkdown(doc: AnswerOptimizedDocument): string {
    const lines: string[] = [];

    lines.push(`# ${doc.h1}`);
    lines.push("");
    lines.push(...doc.directAnswer);
    lines.push("");

    for (const section of doc.sections) {
      lines.push(`## ${section.question}`);
      lines.push(section.shortAnswer);
      lines.push("");
      lines.push(section.explanation);
      lines.push("");
    }

    lines.push("## FAQs");
    lines.push("");

    for (const faq of doc.faqs) {
      lines.push(`### ${faq.question}`);
      lines.push(faq.shortAnswer);
      lines.push("");
      lines.push(faq.explanation);
      lines.push("");
    }

    return lines.join("\n").trim();
  }
}
