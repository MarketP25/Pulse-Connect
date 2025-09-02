import { Locale } from "@/types/i18n";

export class VoiceTranslationService {
  private recognition: SpeechRecognition | null = null;
  private synthesis: SpeechSynthesis;
  private voices: Map<Locale, SpeechSynthesisVoice[]> = new Map();

  constructor() {
    if (typeof window !== "undefined") {
      // Initialize speech recognition
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        this.recognition = new SpeechRecognition();
        this.recognition.continuous = false;
        this.recognition.interimResults = false;
      }

      // Initialize speech synthesis
      this.synthesis = window.speechSynthesis;
      this.loadVoices();
    }
  }

  private async loadVoices(): Promise<void> {
    return new Promise((resolve) => {
      const loadVoicesHandler = () => {
        const allVoices = this.synthesis.getVoices();

        // Group voices by language
        allVoices.forEach((voice) => {
          const locale = voice.lang.split("-")[0] as Locale;
          if (!this.voices.has(locale)) {
            this.voices.set(locale, []);
          }
          this.voices.get(locale)?.push(voice);
        });

        resolve();
      };

      // Chrome loads voices asynchronously
      if (this.synthesis.onvoiceschanged !== undefined) {
        this.synthesis.onvoiceschanged = loadVoicesHandler;
      }

      // For browsers that load voices synchronously
      loadVoicesHandler();
    });
  }

  async startListening(locale: Locale): Promise<string> {
    if (!this.recognition) {
      throw new Error("Speech recognition not supported in this browser");
    }

    return new Promise((resolve, reject) => {
      this.recognition!.lang = locale;

      this.recognition!.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        resolve(transcript);
      };

      this.recognition!.onerror = (event) => {
        reject(new Error(`Speech recognition error: ${event.error}`));
      };

      this.recognition!.start();
    });
  }

  stopListening(): void {
    if (this.recognition) {
      this.recognition.stop();
    }
  }

  async speak(text: string, locale: Locale): Promise<void> {
    await this.loadVoices();

    const utterance = new SpeechSynthesisUtterance(text);
    const voices = this.voices.get(locale) || [];

    if (voices.length > 0) {
      // Use the first available voice for the locale
      utterance.voice = voices[0];
    }

    utterance.lang = locale;

    return new Promise((resolve, reject) => {
      utterance.onend = () => resolve();
      utterance.onerror = (error) => reject(error);
      this.synthesis.speak(utterance);
    });
  }

  pause(): void {
    this.synthesis.pause();
  }

  resume(): void {
    this.synthesis.resume();
  }

  cancel(): void {
    this.synthesis.cancel();
  }

  getVoices(locale: Locale): SpeechSynthesisVoice[] {
    return this.voices.get(locale) || [];
  }

  isRecognitionSupported(): boolean {
    return !!this.recognition;
  }

  isSynthesisSupported(): boolean {
    return "speechSynthesis" in window;
  }
}
