interface TranslationQualityMetrics {
  confidence: number;
  fluency: number;
  adequacy: number;
  consistency: number;
}

interface TranslationMemoryEntry {
  sourceText: string;
  targetText: string;
  locale: string;
  context: string;
  usage: number;
  lastUsed: Date;
  quality: TranslationQualityMetrics;
}

export class TranslationQualityService {
  private memoryStore: Map<string, TranslationMemoryEntry> = new Map();
  private readonly minConfidenceThreshold = 0.7;
  private readonly maxMemoryEntries = 10000;

  private calculateMemoryKey(sourceText: string, targetLocale: string): string {
    return `${sourceText}:${targetLocale}`;
  }

  private calculateTextSimilarity(text1: string, text2: string): number {
    // Implement Levenshtein distance or similar algorithm
    const maxLength = Math.max(text1.length, text2.length);
    if (maxLength === 0) return 1.0;

    const distance = this.levenshteinDistance(text1, text2);
    return 1 - distance / maxLength;
  }

  private levenshteinDistance(text1: string, text2: string): number {
    if (text1.length === 0) return text2.length;
    if (text2.length === 0) return text1.length;

    const matrix: number[][] = [];

    for (let i = 0; i <= text1.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= text2.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= text1.length; i++) {
      for (let j = 1; j <= text2.length; j++) {
        if (text1[i - 1] === text2[j - 1]) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    return matrix[text1.length][text2.length];
  }

  private evaluateTranslationQuality(
    sourceText: string,
    translatedText: string,
    existingTranslations: TranslationMemoryEntry[]
  ): TranslationQualityMetrics {
    // Calculate base confidence
    let confidence = 0.8; // Default confidence

    // Adjust confidence based on existing translations
    if (existingTranslations.length > 0) {
      const similarities = existingTranslations.map((entry) =>
        this.calculateTextSimilarity(entry.targetText, translatedText)
      );
      const maxSimilarity = Math.max(...similarities);
      confidence = (confidence + maxSimilarity) / 2;
    }

    // Calculate fluency (based on text patterns and common structures)
    const fluency = this.calculateFluencyScore(translatedText);

    // Calculate adequacy (how well the meaning is preserved)
    const adequacy = this.calculateAdequacyScore(sourceText, translatedText);

    // Calculate consistency with existing translations
    const consistency = this.calculateConsistencyScore(
      translatedText,
      existingTranslations
    );

    return {
      confidence,
      fluency,
      adequacy,
      consistency,
    };
  }

  private calculateFluencyScore(text: string): number {
    // Implement fluency scoring logic
    // This could check for grammar patterns, sentence structure, etc.
    return 0.85; // Placeholder implementation
  }

  private calculateAdequacyScore(source: string, translation: string): number {
    // Implement adequacy scoring logic
    // This could check for preservation of named entities, numbers, etc.
    return 0.9; // Placeholder implementation
  }

  private calculateConsistencyScore(
    translation: string,
    existingTranslations: TranslationMemoryEntry[]
  ): number {
    if (existingTranslations.length === 0) return 1.0;

    const similarities = existingTranslations.map((entry) =>
      this.calculateTextSimilarity(entry.targetText, translation)
    );

    return similarities.reduce((a, b) => a + b, 0) / similarities.length;
  }

  addToMemory(
    sourceText: string,
    targetText: string,
    locale: string,
    context: string = "general"
  ): void {
    const key = this.calculateMemoryKey(sourceText, locale);
    const existingEntries = Array.from(this.memoryStore.values()).filter(
      (entry) => entry.locale === locale
    );

    const quality = this.evaluateTranslationQuality(
      sourceText,
      targetText,
      existingEntries
    );

    if (quality.confidence >= this.minConfidenceThreshold) {
      const entry: TranslationMemoryEntry = {
        sourceText,
        targetText,
        locale,
        context,
        usage: 1,
        lastUsed: new Date(),
        quality,
      };

      this.memoryStore.set(key, entry);

      // Cleanup old entries if needed
      if (this.memoryStore.size > this.maxMemoryEntries) {
        this.cleanupOldEntries();
      }
    }
  }

  findInMemory(
    sourceText: string,
    targetLocale: string
  ): TranslationMemoryEntry | null {
    const key = this.calculateMemoryKey(sourceText, targetLocale);
    const entry = this.memoryStore.get(key);

    if (entry) {
      entry.usage += 1;
      entry.lastUsed = new Date();
      return entry;
    }

    return null;
  }

  private cleanupOldEntries(): void {
    const entries = Array.from(this.memoryStore.entries()).sort(
      ([, a], [, b]) => {
        // Sort by usage and last used date
        if (a.usage !== b.usage) {
          return a.usage - b.usage;
        }
        return a.lastUsed.getTime() - b.lastUsed.getTime();
      }
    );

    // Remove oldest, least used entries
    const entriesToRemove = Math.floor(this.maxMemoryEntries * 0.2); // Remove 20%
    entries.slice(0, entriesToRemove).forEach(([key]) => {
      this.memoryStore.delete(key);
    });
  }

  getQualityMetrics(
    sourceText: string,
    targetLocale: string
  ): TranslationQualityMetrics | null {
    const entry = this.findInMemory(sourceText, targetLocale);
    return entry ? entry.quality : null;
  }

  getSimilarTranslations(
    text: string,
    locale: string,
    threshold: number = 0.8
  ): TranslationMemoryEntry[] {
    return Array.from(this.memoryStore.values())
      .filter((entry) => {
        if (entry.locale !== locale) return false;
        const similarity = this.calculateTextSimilarity(entry.sourceText, text);
        return similarity >= threshold;
      })
      .sort((a, b) => b.quality.confidence - a.quality.confidence);
  }
}
