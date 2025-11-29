// pages/plans.tsx
import { useLanguage } from "@/context/LanguageProvider";
import { PlanList } from "@/components/PlanList";

const PlansPage: React.FC = () => {
  const { t } = useLanguage();
  return (
    <main>
      <h1>{t("plans.title")}</h1>
      <PlanList />
    </main>
  );
};

export default PlansPage;
