// [CLEANED] Removed redundant React import
import ProgramCardContent from "./ProgramCardContent";

type ProgramCardProps = {
  programKey: string;
  programLabel: string;
  promptValue: string;
  onPromptChange: (val: string) => void;
  onExecute: () => void;
  isLoading: boolean;
  isAccessible: boolean;
};

export default function ProgramCard({
  programKey,
  programLabel,
  promptValue,
  onPromptChange,
  onExecute,
  isLoading,
  isAccessible
}: ProgramCardProps) {
  return (
    <div className="border rounded p-4 bg-white shadow-sm w-full">
      <header className="mb-2">
        <h3 className="text-md font-semibold text-indigo-700">{programLabel}</h3>
      </header>

      {!isAccessible ? (
        <p className="text-xs text-red-500 mt-1" role="alert" aria-live="assertive">
          Upgrade required to use this assistant.
        </p>
      ) : (
        <ProgramCardContent
          programKey={programKey}
          programLabel={programLabel}
          promptValue={promptValue}
          onPromptChange={onPromptChange}
          onExecute={onExecute}
          isLoading={isLoading}
        />
      )}
    </div>
  );
}
