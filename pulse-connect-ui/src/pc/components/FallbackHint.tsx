// [CLEANED] Removed redundant React import
import { fallbackCopy } from "@/config/fallbackCopy";

interface FallbackHintProps {
  role: "guest" | "viewer" | "editor" | "admin";
  funding: "user" | "org";
  language: string;
}

export default function FallbackHint({ role, funding, language }: FallbackHintProps) {
  const key = `${role}-${funding}-${language}` as string;

  const message =
    key in fallbackCopy
      ? fallbackCopy[key as keyof typeof fallbackCopy]
      : (fallbackCopy["guest-org-en"] ?? "Feature unavailable.");

  return (
    <div className="bg-yellow-50 text-yellow-800 px-4 py-2 text-sm rounded shadow">
      🔐 {message}
    </div>
  );
}
