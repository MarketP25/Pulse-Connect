import { useState, useCallback, useRef } from "react";
import { usePathname } from "next/navigation";
import { Locale } from "@/types/i18n";
import { VoiceTranslationService } from "@/lib/services/voiceTranslation";
import { TranslationService } from "@/lib/services/translationService";
import { MicrophoneIcon, StopIcon, PlayIcon, PauseIcon } from "@heroicons/react/24/solid";

interface VoiceMessageProps {
  onMessage?: (text: string, translation: string) => void;
  className?: string;
  maxDuration?: number;
  showTranscript?: boolean;
}

const voiceService = new VoiceTranslationService();
const translationService = new TranslationService();

export default function VoiceMessage({
  onMessage,
  className = "",
  maxDuration = 60,
  showTranscript = true
}: VoiceMessageProps) {
  const pathname = usePathname();
  const currentLocale = (pathname?.split("/")[1] as Locale) || "en";

  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [translation, setTranslation] = useState("");
  const [error, setError] = useState<string | null>(null);

  const recordingTimeout = useRef<NodeJS.Timeout>();

  const startRecording = useCallback(async () => {
    try {
      setError(null);
      setIsRecording(true);

      // Set maximum recording duration
      recordingTimeout.current = setTimeout(() => {
        stopRecording();
      }, maxDuration * 1000);

      const text = await voiceService.startListening(currentLocale);
      setTranscript(text);

      // Translate the transcript
      const { translatedText } = await translationService.translateMessage(text, currentLocale);
      setTranslation(translatedText);

      onMessage?.(text, translatedText);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Recording failed");
      console.error("Recording error:", err);
    } finally {
      setIsRecording(false);
    }
  }, [currentLocale, maxDuration, onMessage]);

  const stopRecording = useCallback(() => {
    if (recordingTimeout.current) {
      clearTimeout(recordingTimeout.current);
    }
    voiceService.stopListening();
    setIsRecording(false);
  }, []);

  const playTranslation = useCallback(async () => {
    try {
      setError(null);
      setIsPlaying(true);
      await voiceService.speak(translation, currentLocale);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Playback failed");
      console.error("Playback error:", err);
    } finally {
      setIsPlaying(false);
    }
  }, [translation, currentLocale]);

  const pausePlayback = useCallback(() => {
    voiceService.pause();
    setIsPlaying(false);
  }, []);

  return (
    <div className={`voice-message ${className}`}>
      <div className="flex items-center space-x-4">
        {/* Recording button */}
        <button
          onClick={isRecording ? stopRecording : startRecording}
          className={`p-3 rounded-full ${
            isRecording ? "bg-red-500 hover:bg-red-600" : "bg-blue-500 hover:bg-blue-600"
          } text-white transition-colors`}
        >
          {isRecording ? <StopIcon className="h-6 w-6" /> : <MicrophoneIcon className="h-6 w-6" />}
        </button>

        {/* Playback button */}
        {translation && (
          <button
            onClick={isPlaying ? pausePlayback : playTranslation}
            className="p-3 rounded-full bg-green-500 hover:bg-green-600 text-white transition-colors"
            disabled={isRecording}
          >
            {isPlaying ? <PauseIcon className="h-6 w-6" /> : <PlayIcon className="h-6 w-6" />}
          </button>
        )}
      </div>

      {/* Transcript and translation */}
      {showTranscript && (transcript || translation) && (
        <div className="mt-4 space-y-2">
          {transcript && (
            <div className="text-sm text-gray-600">
              <div className="font-medium">Original:</div>
              <div>{transcript}</div>
            </div>
          )}
          {translation && (
            <div className="text-sm text-gray-600">
              <div className="font-medium">Translation:</div>
              <div>{translation}</div>
            </div>
          )}
        </div>
      )}

      {/* Error message */}
      {error && <div className="mt-2 text-sm text-red-500">{error}</div>}
    </div>
  );
}
