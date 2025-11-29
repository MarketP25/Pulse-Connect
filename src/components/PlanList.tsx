import React from "react";
import { useRouter } from "next/router";

import type { Plan, Locale } from "@/types/plan";
import { usePlan } from "@/hooks/usePlan";
import { getLocalizedValue } from "@/lib/i18n";

export const PlanList: React.FC = () => {
  const { plans, loading, error } = usePlan();
  const locale = (useRouter().locale ?? "en") as Locale;

  if (loading) return <p>Loading plans…</p>;
  if (error)   return <p>Failed to load plans.</p>;

  return (
    <div>
      {plans.map((plan: Plan) => (
        <div key={plan.id} className="plan-card">
          <h2>{getLocalizedValue(plan.name, locale)}</h2>
          <p>{getLocalizedValue(plan.description, locale)}</p>
          <p>
            Region: {plan.region} •{" "}
            {getLocalizedValue(plan.currency, locale)}{" "}
            {plan.price.toFixed(2)}
          </p>
        </div>
      ))}
    </div>
  );
};