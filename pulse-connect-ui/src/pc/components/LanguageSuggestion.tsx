import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { Locale } from "@/types/i18n";
import { LanguageLearningService } from "@/lib/services/languageLearning";
import { VoiceTranslationService } from "@/lib/services/voiceTranslation";
import {
  SpeakerWaveIcon,
  CheckIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import styles from "./LanguageSuggestion.module.css";

interface LanguageSuggestionProps {
  targetLocale: Locale;
  className?: string;
}

const learningService = new LanguageLearningService();
const voiceService = new VoiceTranslationService();

export default function LanguageSuggestion({
  targetLocale,
  className = "",
}: LanguageSuggestionProps) {
  const pathname = usePathname();
  const currentLocale = (pathname?.split("/")[1] as Locale) || "en";

  const [suggestedPhrases, setSuggestedPhrases] = useState<any[]>([]);
  const [progress, setProgress] = useState({ known: 0, mastered: 0, total: 0 });
  const [isPlaying, setIsPlaying] = useState<string | null>(null);

  useEffect(() => {
    updateSuggestions();
    updateProgress();
  }, [currentLocale, targetLocale]);

  const updateSuggestions = () => {
    const phrases = learningService.getSuggestedPhrases({
      sourceLocale: currentLocale,
      targetLocale,
    });
    setSuggestedPhrases(phrases);
  };

  const updateProgress = () => {
    const newProgress = learningService.getProgress({
      sourceLocale: currentLocale,
      targetLocale,
    });
    setProgress(newProgress);
  };

  const playPhrase = async (phrase: string, isTranslation: boolean) => {
    try {
      setIsPlaying(phrase);
      await voiceService.speak(
        phrase,
        isTranslation ? targetLocale : currentLocale
      );
    } catch (error) {
      console.error("Error playing phrase:", error);
    } finally {
      setIsPlaying(null);
    }
  };

  const handlePhraseReview = (phrase: string, known: boolean) => {
    learningService.markPhraseAsReviewed(
      phrase,
      { sourceLocale: currentLocale, targetLocale },
      known
    );
    updateSuggestions();
    updateProgress();
  };

  return (
    <div className={`language-suggestions ${className}`}>
      {/* Progress Section */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <h3 className="text-lg font-semibold mb-2">Learning Progress</h3>
        <div className="flex justify-between text-sm">
          <span>Known: {progress.known}</span>
          <span>Mastered: {progress.mastered}</span>
          <span>Total: {progress.total}</span>
        </div>
        <div className={styles["language-progress-bar"]}>
          <div
            className={styles["language-progress-fill"]}
            style={{
              width: `${(progress.mastered / progress.total) * 100}%`,
            }}
            role="progressbar"
            aria-label={`Language mastery progress: ${Math.round((progress.mastered / progress.total) * 100)}%`}
            aria-valuenow={(progress.mastered / progress.total) * 100}
            aria-valuemin={0}
            aria-valuemax={100}
          />
        </div>
      </div>

      {/* Phrases Section */}
      <div className="space-y-4">
        {suggestedPhrases.map((phrase) => (
          <div
            key={phrase.phrase}
            className="p-4 border rounded-lg hover:shadow-sm transition-shadow"
          >
            {/* Original Phrase */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex-1">
                <p className="font-medium">{phrase.phrase}</p>
              </div>
              <button
                onClick={() => playPhrase(phrase.phrase, false)}
                className={`ml-2 p-2 rounded-full hover:bg-gray-100 ${
                  isPlaying === phrase.phrase
                    ? "text-blue-500"
                    : "text-gray-500"
                }`}
                aria-label={`Play original phrase in ${currentLocale}`}
              >
                <SpeakerWaveIcon className="h-5 w-5" />
              </button>
            </div>

            {/* Translation */}
            <div className="flex items-center justify-between text-sm text-gray-600">
              <div className="flex-1">
                <p>{phrase.translation}</p>
              </div>
              <button
                onClick={() => playPhrase(phrase.translation, true)}
                className={`ml-2 p-2 rounded-full hover:bg-gray-100 ${
                  isPlaying === phrase.translation
                    ? "text-blue-500"
                    : "text-gray-500"
                }`}
                aria-label={`Play translated phrase in ${targetLocale}`}
              >
                <SpeakerWaveIcon className="h-5 w-5" />
              </button>
            </div>

            {/* Context */}
            <p className="text-xs text-gray-500 mt-2">
              Context: {phrase.context}
            </p>

            {/* Review Buttons */}
            <div className="mt-3 flex justify-end space-x-2">
              <button
                onClick={() => handlePhraseReview(phrase.phrase, false)}
                className="p-2 text-red-500 hover:bg-red-50 rounded-full"
                aria-label="Mark phrase as not known"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
              <button
                onClick={() => handlePhraseReview(phrase.phrase, true)}
                className="p-2 text-green-500 hover:bg-green-50 rounded-full"
                aria-label="Mark phrase as known"
              >
                <CheckIcon className="h-5 w-5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
