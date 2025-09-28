// src/pages/marketplace/upgrade.tsx

import { NextPage } from "next";
import { useRouter } from "next/router";
import { getLocalizedValue } from "../../lib/i18n";
import type { Plan, Locale } from "../../types/plan";
import { usePlan } from "../../hooks/usePlan";

const UpgradePage: NextPage = () => {
  // 1. Get Next.js router and extract locale
  const router = useRouter();
  const locale = (router.locale ?? "en") as Locale;

  // 2. Fetch plans via your SWR hook
  const { plans, loading, error } = usePlan();

  if (loading) return <div>Loading…</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      {plans.map((plan: Plan) => (
        <div key={plan.id}>
          <h2>{getLocalizedValue(plan.name, locale)}</h2>
          <p>{getLocalizedValue(plan.description, locale)}</p>
          <p>
            {getLocalizedValue(plan.currency, locale)} {plan.price.toFixed(2)}
          </p>
          <button
            onClick={() => {
              /* [CLEANED] Removed debug log */
            }}
          >
            {getLocalizedValue(
              {
                en: "Upgrade",
                es: "Actualizar",
                fr: "Mettre à niveau",
                de: "Aktualisieren",
                sw: "Sasisha"
              },
              locale
            )}
          </button>
        </div>
      ))}
    </div>
  );
};

export default UpgradePage;
