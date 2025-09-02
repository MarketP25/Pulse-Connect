import { useLanguage } from "@/context/LanguageProvider";

import type { Plan, Locale } from "@/types/plan";
import { usePlan } from "@/hooks/usePlan";
import { getLocalizedValue } from "@/lib/i18n";

const PlanList = () => {
  const { plans, loading, error } = usePlan();
  const { lang } = useLanguage();

  if (loading) return <p>Loading plans…</p>;
  if (error) return <p>Failed to load plans.</p>;

  return (
    <div>
      {plans.map((plan: Plan) => (
        <div key={plan.id} className="plan-card">
          <h2>{getLocalizedValue(plan.name, lang as "en" | "sw" | "yo" | "ar" | "pt" | "hi")}</h2>
          <p>
            {getLocalizedValue(plan.description, lang as "en" | "sw" | "yo" | "ar" | "pt" | "hi")}
          </p>
          <p>
            Region: {plan.region} •{" "}
            {getLocalizedValue(plan.currency, lang as "en" | "sw" | "yo" | "ar" | "pt" | "hi")}{" "}
            {plan.price.toFixed(2)}
          </p>
        </div>
      ))}
    </div>
  );
};

export default PlanList;
