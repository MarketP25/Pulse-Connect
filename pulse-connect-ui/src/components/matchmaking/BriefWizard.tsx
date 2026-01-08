"use client";

import { useState } from "react";

interface BriefFormData {
  scope: string;
  deliverables: string;
  budget_min: number;
  budget_max: number;
  currency: string;
  required_skills: string[];
  language: string;
  geo_radius: number;
}

interface MatchResult {
  brief_id: number;
  matches: Array<{
    user_id: number;
    score: number;
    top_signals: string[];
    reason: string;
  }>;
  trace_id: string;
}

export default function BriefWizard() {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<BriefFormData>({
    scope: "",
    deliverables: "",
    budget_min: 0,
    budget_max: 0,
    currency: "USD",
    required_skills: [],
    language: "en",
    geo_radius: 0
  });

  const [skillInput, setSkillInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [matchResult, setMatchResult] = useState<MatchResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const steps = [
    { id: 1, title: "Project Scope", description: "Describe your project" },
    { id: 2, title: "Requirements", description: "Define deliverables and skills" },
    { id: 3, title: "Budget & Location", description: "Set budget and preferences" },
    { id: 4, title: "Review & Match", description: "Review and find providers" }
  ];

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name.includes("budget") || name === "geo_radius" ? parseFloat(value) || 0 : value
    }));
  };

  const addSkill = () => {
    if (skillInput.trim() && !formData.required_skills.includes(skillInput.trim())) {
      setFormData((prev) => ({
        ...prev,
        required_skills: [...prev.required_skills, skillInput.trim()]
      }));
      setSkillInput("");
    }
  };

  const removeSkill = (skill: string) => {
    setFormData((prev) => ({
      ...prev,
      required_skills: prev.required_skills.filter((s) => s !== skill)
    }));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addSkill();
    }
  };

  const nextStep = () => {
    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError(null);

    try {
      // First create the brief
      const briefResponse = await fetch("/api/matchmaking/briefs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": "1" // TODO: Get from auth context
        },
        body: JSON.stringify(formData)
      });

      if (!briefResponse.ok) {
        throw new Error("Failed to create brief");
      }

      const briefData = await briefResponse.json();

      // Then get matches
      const matchResponse = await fetch(`/api/matchmaking/briefs/${briefData.brief.id}/matches`, {
        headers: {
          "x-user-id": "1"
        }
      });

      if (!matchResponse.ok) {
        throw new Error("Failed to get matches");
      }

      const matchData = await matchResponse.json();
      setMatchResult(matchData);
      setCurrentStep(5); // Show results
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetWizard = () => {
    setCurrentStep(1);
    setFormData({
      scope: "",
      deliverables: "",
      budget_min: 0,
      budget_max: 0,
      currency: "USD",
      required_skills: [],
      language: "en",
      geo_radius: 0
    });
    setMatchResult(null);
    setError(null);
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div>
              <label htmlFor="scope" className="block text-sm font-medium text-gray-700 mb-2">
                Project Scope *
              </label>
              <textarea
                id="scope"
                name="scope"
                value={formData.scope}
                onChange={handleInputChange}
                required
                rows={6}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Describe your project in detail. What problem are you trying to solve? What are the main objectives?"
              />
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div>
              <label
                htmlFor="deliverables"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Deliverables *
              </label>
              <textarea
                id="deliverables"
                name="deliverables"
                value={formData.deliverables}
                onChange={handleInputChange}
                required
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="What specific deliverables do you expect? Be as detailed as possible."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Required Skills *
              </label>
              <div className="flex gap-2 mb-3">
                <input
                  type="text"
                  value={skillInput}
                  onChange={(e) => setSkillInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., React, Node.js, Python"
                />
                <button
                  type="button"
                  onClick={addSkill}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Add
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {formData.required_skills.map((skill) => (
                  <span
                    key={skill}
                    className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800"
                  >
                    {skill}
                    <button
                      type="button"
                      onClick={() => removeSkill(skill)}
                      className="ml-2 text-blue-600 hover:text-blue-800"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="budget_min"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Minimum Budget
                </label>
                <input
                  type="number"
                  id="budget_min"
                  name="budget_min"
                  value={formData.budget_min}
                  onChange={handleInputChange}
                  min="0"
                  step="0.01"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="1000.00"
                />
              </div>

              <div>
                <label
                  htmlFor="budget_max"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Maximum Budget *
                </label>
                <input
                  type="number"
                  id="budget_max"
                  name="budget_max"
                  value={formData.budget_max}
                  onChange={handleInputChange}
                  required
                  min="0"
                  step="0.01"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="5000.00"
                />
              </div>
            </div>

            <div>
              <label htmlFor="currency" className="block text-sm font-medium text-gray-700 mb-2">
                Currency
              </label>
              <select
                id="currency"
                name="currency"
                value={formData.currency}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="GBP">GBP</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="language" className="block text-sm font-medium text-gray-700 mb-2">
                  Preferred Language
                </label>
                <select
                  id="language"
                  name="language"
                  value={formData.language}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="en">English</option>
                  <option value="es">Spanish</option>
                  <option value="fr">French</option>
                  <option value="de">German</option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="geo_radius"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Geographic Radius (km)
                </label>
                <input
                  type="number"
                  id="geo_radius"
                  name="geo_radius"
                  value={formData.geo_radius}
                  onChange={handleInputChange}
                  min="0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="50 (leave 0 for global)"
                />
                <p className="text-xs text-gray-500 mt-1">Leave empty for global search</p>
              </div>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div className="bg-gray-50 rounded-lg p-6">
              <h3 className="font-semibold mb-4">Review Your Brief</h3>
              <div className="space-y-3 text-sm">
                <div>
                  <strong>Scope:</strong> {formData.scope}
                </div>
                <div>
                  <strong>Deliverables:</strong> {formData.deliverables}
                </div>
                <div>
                  <strong>Budget:</strong> ${formData.budget_min.toLocaleString()} - $
                  {formData.budget_max.toLocaleString()} {formData.currency}
                </div>
                <div>
                  <strong>Skills:</strong> {formData.required_skills.join(", ") || "None specified"}
                </div>
                <div>
                  <strong>Language:</strong> {formData.language}
                </div>
                <div>
                  <strong>Location:</strong>{" "}
                  {formData.geo_radius > 0 ? `Within ${formData.geo_radius}km` : "Global"}
                </div>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                {error}
              </div>
            )}

            <div className="text-center">
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="bg-blue-600 text-white px-8 py-3 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium text-lg"
              >
                {isSubmitting ? "Finding Matches..." : "Find Providers"}
              </button>
            </div>
          </div>
        );

      case 5:
        return matchResult ? (
          <div className="space-y-6">
            <div className="text-center">
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Matches Found!</h3>
              <p className="text-gray-600">Here are the best providers for your project.</p>
            </div>

            <div className="space-y-4">
              {matchResult.matches.map((match, index) => (
                <div key={match.user_id} className="bg-white border border-gray-200 rounded-lg p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h4 className="font-semibold">Provider #{match.user_id}</h4>
                      <div className="flex items-center mt-1">
                        <span className="text-sm text-gray-600">Match Score: </span>
                        <span className="ml-1 font-medium text-blue-600">
                          {(match.score * 100).toFixed(1)}%
                        </span>
                      </div>
                    </div>
                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                      #{index + 1}
                    </span>
                  </div>

                  <div className="mb-4">
                    <h5 className="text-sm font-medium text-gray-700 mb-2">Why this match:</h5>
                    <p className="text-sm text-gray-600">{match.reason}</p>
                  </div>

                  <div className="mb-4">
                    <h5 className="text-sm font-medium text-gray-700 mb-2">Key Signals:</h5>
                    <div className="flex flex-wrap gap-2">
                      {match.top_signals.map((signal, idx) => (
                        <span
                          key={idx}
                          className="text-xs bg-gray-100 text-gray-800 px-2 py-1 rounded"
                        >
                          {signal}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <button className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 text-sm">
                      Send Proposal Request
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="text-center">
              <button
                onClick={resetWizard}
                className="bg-gray-600 text-white px-6 py-2 rounded-md hover:bg-gray-700"
              >
                Create Another Brief
              </button>
            </div>
          </div>
        ) : null;

      default:
        return null;
    }
  };

  return (
    <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-lg p-8">
      {/* Progress Steps */}
      <div className="mb-8">
        <div className="flex justify-between">
          {steps.map((step) => (
            <div key={step.id} className="flex flex-col items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  step.id < currentStep
                    ? "bg-green-600 text-white"
                    : step.id === currentStep
                      ? "bg-blue-600 text-white"
                      : "bg-gray-300 text-gray-600"
                }`}
              >
                {step.id < currentStep ? "✓" : step.id}
              </div>
              <div className="text-center mt-2">
                <div className="text-sm font-medium">{step.title}</div>
                <div className="text-xs text-gray-500">{step.description}</div>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${((currentStep - 1) / (steps.length - 1)) * 100}%` }}
          />
        </div>
      </div>

      {/* Step Content */}
      <div className="min-h-[400px]">{renderStepContent()}</div>

      {/* Navigation */}
      {currentStep < 4 && currentStep !== 5 && (
        <div className="flex justify-between mt-8">
          <button
            onClick={prevStep}
            disabled={currentStep === 1}
            className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          <button
            onClick={nextStep}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
