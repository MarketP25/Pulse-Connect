// [CLEANED] Removed redundant React import

type ProgramCardContentProps = {
  programKey: string;
  programLabel: string;
  promptValue: string;
  onPromptChange: (val: string) => void;
  onExecute: () => void;
  isLoading: boolean;
};

export default function ProgramCardContent({
  programKey,
  programLabel,
  promptValue,
  onPromptChange,
  onExecute,
  isLoading
}: ProgramCardContentProps) {
  return (
    <div className="mt-2 space-y-2">
      <label htmlFor={`${programKey}-input`} className="text-sm font-medium text-gray-700">
        {`${programLabel} Input`}
      </label>
      <input
        id={`${programKey}-input`}
        type="text"
        className="border rounded px-2 py-1 w-full text-sm"
        placeholder={`Enter ${programKey} prompt`}
        value={promptValue}
        onChange={(e) => onPromptChange(e.target.value)}
        aria-label={`${programKey} personalization`}
      />
      <button
        className="bg-indigo-600 text-white px-3 py-1 rounded font-semibold text-sm hover:bg-indigo-700 transition disabled:opacity-50"
        onClick={onExecute}
        disabled={isLoading}
        aria-live="polite"
      >
        {isLoading ? "Loading..." : `Generate ${programLabel}`}
      </button>
    </div>
  );
}
