import React, { useState } from "react";
import { useRole } from "@/context/RoleContext";
import { FeatureLabels } from "@/config/FeatureLabels";

type PaymentMethod = "mpesa" | "paystack";

type UpgradePlan = {
  id: string;
  name: string;
  price: string;
  description: string;
  method: PaymentMethod;
  features: string[];
};

interface UpgradeModalProps {
  availablePlans: UpgradePlan[];
  onConfirm: (plan: UpgradePlan) => void;
  onClose: () => void;
}

export default function UpgradeModal({ availablePlans, onConfirm, onClose }: UpgradeModalProps) {
  const [selectedPlan, setSelectedPlan] = useState<UpgradePlan | null>(null);
  const { language } = useRole();

  const heading: Record<string, string> = {
    en: "🔓 Unlock Premium Features",
    sw: "🔓 Fungua Huduma za Juu",
    yo: "🔓 Ṣí Awọn ẹya-ara àtọwọn",
    ar: "🔓 افتح الميزات المتميزة",
    hi: "🔓 प्रीमियम सुविधाएं अनलॉक करें",
    pt: "🔓 Desbloqueie Recursos Premium"
  };

  const subtitle: Record<string, string> = {
    en: "Choose a plan to enable premium features.",
    sw: "Chagua mpango ili kufungua huduma hizi.",
    yo: "Yan eto lati lo awọn ẹya àtọwọn.",
    ar: "اختر خطة لتمكين الميزات المتميزة.",
    hi: "प्रीमियम सुविधाएं सक्षम करने के लिए योजना चुनें।",
    pt: "Escolha um plano para habilitar os recursos premium."
  };

  const continueText: Record<string, string> = {
    en: "Continue to Payment",
    sw: "Endelea na Malipo",
    yo: "Tẹsiwaju si sisanwo",
    ar: "تابع إلى الدفع",
    hi: "भुगतान जारी रखें",
    pt: "Continuar para o Pagamento"
  };

  const cancelText: Record<string, string> = {
    en: "Cancel",
    sw: "Ghairi",
    yo: "Fagilee",
    ar: "إلغاء",
    hi: "रद्द करें",
    pt: "Cancelar"
  };

  const via: Record<PaymentMethod, Record<string, string>> = {
    mpesa: {
      en: "M-Pesa 🇰🇪",
      sw: "M-Pesa 🇰🇪",
      yo: "M-Pesa 🇰🇪",
      ar: "M-Pesa 🇰🇪",
      hi: "M-Pesa 🇰🇪",
      pt: "M-Pesa 🇰🇪"
    },
    paystack: {
      en: "Paystack 🇳🇬",
      sw: "Paystack 🇳🇬",
      yo: "Paystack 🇳🇬",
      ar: "Paystack 🇳🇬",
      hi: "Paystack 🇳🇬",
      pt: "Paystack 🇳🇬"
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-40 flex items-center justify-center">
      <div className="bg-white w-full max-w-md p-6 rounded shadow-lg">
        <h2 className="text-lg font-semibold mb-4">{heading[language] ?? heading.en}</h2>
        <p className="mb-3 text-sm text-gray-700">{subtitle[language] ?? subtitle.en}</p>

        <div className="space-y-3 mb-4">
          {availablePlans.map((plan) => (
            <button
              key={plan.id}
              onClick={() => setSelectedPlan(plan)}
              className={`w-full text-left p-3 border rounded ${
                selectedPlan?.id === plan.id ? "border-blue-600 bg-blue-50" : "border-gray-300"
              }`}
            >
              <div className="font-semibold">{plan.name}</div>
              <ul className="text-sm text-gray-600 list-disc pl-4 mt-1">
                {plan.features.map((f) => (
                  <li key={f}>{FeatureLabels[language]?.[f] ?? FeatureLabels["en"]?.[f] ?? f}</li>
                ))}
              </ul>
              <div className="text-sm text-gray-500 mt-2">
                {plan.price} – Pay via {via[plan.method]?.[language] ?? via[plan.method].en}
              </div>
            </button>
          ))}
        </div>

        <div className="flex justify-between mt-6">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:underline">
            {cancelText[language] ?? cancelText.en}
          </button>
          <button
            onClick={() => selectedPlan && onConfirm(selectedPlan)}
            disabled={!selectedPlan}
            className="px-4 py-2 text-sm bg-blue-700 text-white rounded hover:bg-blue-800 disabled:opacity-50"
          >
            {continueText[language] ?? continueText.en}
          </button>
        </div>
      </div>
    </div>
  );
}
