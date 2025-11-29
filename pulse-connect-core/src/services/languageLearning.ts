import { Locale } from "@/types/i18n";

interface PhraseUsage {
  phrase: string;
  translation: string;
  context: string;
  frequency: number;
  lastUsed: Date;
}

interface LanguagePair {
  sourceLocale: Locale;
  targetLocale: Locale;
}

interface LearningProgress {
  knownPhrases: Set<string>;
  masteredPhrases: Set<string>;
  reviewDue: Map<string, Date>;
}

export class LanguageLearningService {
  private phraseUsage: Map<string, PhraseUsage> = new Map();
  private userProgress: Map<string, LearningProgress> = new Map();
  private readonly reviewIntervals = [1, 3, 7, 14, 30, 90]; // Days between reviews

  private getLanguagePairKey(pair: LanguagePair): string {
    return `${pair.sourceLocale}-${pair.targetLocale}`;
  }

  trackPhraseUsage(
    phrase: string,
    translation: string,
    context: string,
    languagePair: LanguagePair
  ): void {
    const key = `${this.getLanguagePairKey(languagePair)}:${phrase}`;
    const existing = this.phraseUsage.get(key);

    if (existing) {
      existing.frequency += 1;
      existing.lastUsed = new Date();
      this.phraseUsage.set(key, existing);
    } else {
      this.phraseUsage.set(key, {
        phrase,
        translation,
        context,
        frequency: 1,
        lastUsed: new Date(),
      });
    }
  }

  getSuggestedPhrases(
    languagePair: LanguagePair,
    limit: number = 5
  ): PhraseUsage[] {
    const pairKey = this.getLanguagePairKey(languagePair);
    const progress = this.userProgress.get(pairKey) || {
      knownPhrases: new Set(),
      masteredPhrases: new Set(),
      reviewDue: new Map(),
    };

    // Get all phrases for this language pair
    const relevantPhrases = Array.from(this.phraseUsage.entries())
      .filter(([key]) => key.startsWith(pairKey))
      .map(([, usage]) => usage)
      .filter((usage) => !progress.masteredPhrases.has(usage.phrase))
      .sort((a, b) => {
        // Sort by frequency and recency
        if (a.frequency !== b.frequency) {
          return b.frequency - a.frequency;
        }
        return b.lastUsed.getTime() - a.lastUsed.getTime();
      });

    return relevantPhrases.slice(0, limit);
  }

  markPhraseAsReviewed(
    phrase: string,
    languagePair: LanguagePair,
    known: boolean
  ): void {
    const pairKey = this.getLanguagePairKey(languagePair);
    let progress = this.userProgress.get(pairKey);

    if (!progress) {
      progress = {
        knownPhrases: new Set(),
        masteredPhrases: new Set(),
        reviewDue: new Map(),
      };
      this.userProgress.set(pairKey, progress);
    }

    if (known) {
      progress.knownPhrases.add(phrase);

      // Schedule next review
      const reviewCount = this.getReviewCount(phrase, progress);
      const nextReview = this.calculateNextReview(reviewCount);
      progress.reviewDue.set(phrase, nextReview);

      // Check if phrase is mastered
      if (reviewCount >= this.reviewIntervals.length) {
        progress.masteredPhrases.add(phrase);
        progress.reviewDue.delete(phrase);
      }
    } else {
      // Reset progress for this phrase
      progress.knownPhrases.delete(phrase);
      progress.masteredPhrases.delete(phrase);
      progress.reviewDue.delete(phrase);
    }
  }

  private getReviewCount(phrase: string, progress: LearningProgress): number {
    let count = 0;
    if (progress.knownPhrases.has(phrase)) count++;
    if (progress.masteredPhrases.has(phrase)) {
      count = this.reviewIntervals.length;
    }
    return count;
  }

  private calculateNextReview(reviewCount: number): Date {
    const intervalIndex = Math.min(
      reviewCount,
      this.reviewIntervals.length - 1
    );
    const daysToAdd = this.reviewIntervals[intervalIndex];

    const nextReview = new Date();
    nextReview.setDate(nextReview.getDate() + daysToAdd);
    return nextReview;
  }

  getPhrasesForReview(languagePair: LanguagePair): PhraseUsage[] {
    const pairKey = this.getLanguagePairKey(languagePair);
    const progress = this.userProgress.get(pairKey);

    if (!progress) return [];

    const now = new Date();
    const dueReviews: PhraseUsage[] = [];

    progress.reviewDue.forEach((dueDate, phrase) => {
      if (dueDate <= now) {
        const key = `${pairKey}:${phrase}`;
        const usage = this.phraseUsage.get(key);
        if (usage) {
          dueReviews.push(usage);
        }
      }
    });

    return dueReviews;
  }

  getProgress(languagePair: LanguagePair): {
    known: number;
    mastered: number;
    total: number;
  } {
    const pairKey = this.getLanguagePairKey(languagePair);
    const progress = this.userProgress.get(pairKey);

    if (!progress) {
      return { known: 0, mastered: 0, total: 0 };
    }

    const total = Array.from(this.phraseUsage.keys()).filter((key) =>
      key.startsWith(pairKey)
    ).length;

    return {
      known: progress.knownPhrases.size,
      mastered: progress.masteredPhrases.size,
      total,
    };
  }
}
