import { Locale } from "@/types/i18n";

export interface TranslationResult {
  translatedText: string;
  detectedSourceLanguage?: string;
  confidence?: number;
}

export class TranslationService {
  private apiKey: string;
  private endpoint: string;

  constructor() {
    this.apiKey = process.env.AZURE_TRANSLATOR_KEY || "";
    this.endpoint = process.env.AZURE_TRANSLATOR_ENDPOINT || "";
  }

  async translateMessage(
    text: string,
    targetLanguage: Locale,
    sourceLanguage?: Locale
  ): Promise<TranslationResult> {
    const url = new URL(`${this.endpoint}/translate`);
    url.searchParams.append("api-version", "3.0");
    url.searchParams.append("to", targetLanguage);
    if (sourceLanguage) {
      url.searchParams.append("from", sourceLanguage);
    }

    try {
      const response = await fetch(url.toString(), {
        method: "POST",
        headers: {
          "Ocp-Apim-Subscription-Key": this.apiKey,
          "Content-Type": "application/json"
        },
        body: JSON.stringify([{ text }])
      });

      if (!response.ok) {
        throw new Error(`Translation failed: ${response.statusText}`);
      }

      const [result] = await response.json();
      return {
        translatedText: result.translations[0].text,
        detectedSourceLanguage: result.detectedLanguage?.language,
        confidence: result.detectedLanguage?.score
      };
    } catch (error) {
      console.error("Translation error:", error);
      throw error;
    }
  }

  async detectLanguage(text: string): Promise<string> {
    const url = new URL(`${this.endpoint}/detect`);
    url.searchParams.append("api-version", "3.0");

    try {
      const response = await fetch(url.toString(), {
        method: "POST",
        headers: {
          "Ocp-Apim-Subscription-Key": this.apiKey,
          "Content-Type": "application/json"
        },
        body: JSON.stringify([{ text }])
      });

      if (!response.ok) {
        throw new Error(`Language detection failed: ${response.statusText}`);
      }

      const [result] = await response.json();
      return result.language;
    } catch (error) {
      console.error("Language detection error:", error);
      throw error;
    }
  }
}
