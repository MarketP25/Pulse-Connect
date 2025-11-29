// [CLEANED] Removed redundant React import
import { fallbackCopy } from "@/config/fallbackCopy";

interface FallbackModalProps {
  role: "guest" | "viewer" | "editor" | "admin";
  funding: "user" | "org";
  language: string;
  tier: string;
  onConfirm?: () => void;
  onClose?: () => void;
}

export default function FallbackModal({
  role,
  funding,
  language,
  tier,
  onConfirm,
  onClose
}: FallbackModalProps) {
  const key = `${role}-${funding}-${language}` as string;

  const fallbackMessage =
    key in fallbackCopy
      ? fallbackCopy[key as keyof typeof fallbackCopy]
      : (fallbackCopy["guest-org-en"] ?? "Feature unavailable.");

  const cta =
    funding === "user"
      ? ({
          en: `Upgrade to ${tier}`,
          sw: `Boresha hadi ${tier}`,
          yo: `Imudojuiwọn si ${tier}`,
          ar: `الترقية إلى ${tier}`,
          hi: `${tier} के लिए अपग्रेड करें`,
          pt: `Atualize para ${tier}`
        }[language] ?? `Upgrade to ${tier}`)
      : ({
          en: `Request ${tier} from your organization`,
          sw: `Omba ${tier} kutoka kwa shirika lako`,
          yo: `Beere ${tier} lọwọ ẹgbẹ rẹ`,
          ar: `اطلب ${tier} من منظمتك`,
          hi: `अपनी संस्था से ${tier} का अनुरोध करें`,
          pt: `Solicite ${tier} à sua organização`
        }[language] ?? `Request ${tier} from your organization`);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-2 right-2 text-gray-400 hover:text-gray-600"
        >
          &times;
        </button>

        <div className="flex items-center gap-2 mb-4">
          <img src="/icon.png" alt="PulseConnect" className="w-6 h-6 animate-pulse" />
          <h2 className="text-lg font-bold text-gray-800">{tier} Feature</h2>
        </div>

        <p className="text-sm text-gray-700 mb-4">{fallbackMessage}</p>

        <button
          onClick={onConfirm}
          className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          {cta}
        </button>
      </div>
    </div>
  );
}
