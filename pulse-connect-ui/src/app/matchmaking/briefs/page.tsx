import BriefWizard from "@/components/matchmaking/BriefWizard";

export default function BriefsPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Create a Brief</h1>
          <p className="text-gray-600 mt-2">
            Define your project requirements and find matching providers
          </p>
        </div>
        <BriefWizard />
      </div>
    </div>
  );
}
