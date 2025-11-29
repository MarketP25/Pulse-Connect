// [CLEANED] Removed redundant React import

export type ProgramType = "marketing" | "workout" | "tutorial" | "forex";

interface Props {
  type: ProgramType;
  label: string;
  planLabel: string;
  prompt: string;
  onPromptChange: (val: string) => void;
  onGenerate: () => void;
  loading: boolean;
  hasAccess: boolean;
}

export default function ProgramItem({
  type,
  label,
  planLabel,
  prompt,
  onPromptChange,
  onGenerate,
  loading,
  hasAccess
}: Props) {
  return (
    <li>
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
        <div>
          <strong className="text-indigo-800">{label}</strong>{" "}
          <span className="text-xs text-gray-500">(Requires {planLabel})</span>
        </div>
        <div className="flex gap-2 items-center">
          <input
            type="text"
            value={prompt}
            onChange={(e) => onPromptChange(e.target.value)}
            placeholder={`e.g. ${
              type === "workout"
                ? "Home HIIT"
                : type === "tutorial"
                  ? "Landing page design"
                  : "Instagram growth"
            }`}
            className="border rounded px-2 py-1 text-xs"
            aria-label={`${type} prompt`}
          />

          {hasAccess ? (
            <button
              onClick={onGenerate}
              disabled={loading}
              className="px-3 py-1 bg-indigo-600 text-white rounded text-sm hover:bg-indigo-700 transition"
            >
              {loading ? "⏳ Generating" : "Generate"}
            </button>
          ) : (
            <button
              onClick={() => (window.location.href = "/pricing")}
              className="px-3 py-1 underline text-indigo-600 text-sm"
            >
              Upgrade to {planLabel}
            </button>
          )}
        </div>
      </div>
    </li>
  );
}
