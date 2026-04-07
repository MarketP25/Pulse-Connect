import { DashboardDictionary } from "@/lib/dashboard/i18n";

export interface LocalizationTranslationResult {
  dictionary: DashboardDictionary;
  provider: string;
  targetLanguage: string;
}

type TranslationEntry = {
  key: keyof DashboardDictionary;
  text: string;
};

const FALLBACK_TRANSLATIONS: Record<string, Partial<DashboardDictionary>> = {
  sw: {
    title: "Dashibodi ya Mtumiaji ya PULSCO",
    subtitle: "Eneo la kazi lenye akili kwa CSI, AI, ecommerce, maeneo, na mawasiliano.",
    onboarding: "Uanzishaji",
    profile: "Wasifu",
    subscription: "Usajili",
    ecommerce: "Biashara Mtandaoni",
    insights: "Maarifa ya AI",
    places: "Maeneo na Ulinganifu",
    communication: "Mawasiliano",
    marketing: "Uuzaji Otomatiki",
    security: "Usalama na Faragha",
    operations: "Uendeshaji",
    kycRequired: "Uthibitishaji kamili wa KYC unahitajika kwa vipengele vya tier ya kulipia.",
    save: "Hifadhi",
    purchase: "Nunua",
    send: "Tuma",
    completeKyc: "Kamilisha KYC",
    tierBasic: "Msingi",
    tierPremium: "Premium",
    tierEnterprise: "Biashara Kubwa"
  },
  fr: {
    title: "Tableau de bord utilisateur PULSCO",
    subtitle: "Espace intelligent pour CSI, IA, ecommerce, lieux et communication.",
    onboarding: "Intégration",
    profile: "Profil",
    subscription: "Abonnement",
    ecommerce: "Ecommerce",
    insights: "Analyses IA",
    places: "Lieux et matching",
    communication: "Communication",
    marketing: "Marketing automatisé",
    security: "Sécurité et confidentialité",
    operations: "Opérations",
    kycRequired: "Une vérification KYC complète est requise pour les offres payantes.",
    save: "Enregistrer",
    purchase: "Acheter",
    send: "Envoyer",
    completeKyc: "Terminer KYC",
    tierBasic: "Basique",
    tierPremium: "Premium",
    tierEnterprise: "Entreprise"
  },
  es: {
    title: "Panel de Usuario PULSCO",
    subtitle: "Espacio inteligente para CSI, IA, ecommerce, lugares y comunicación.",
    onboarding: "Incorporación",
    profile: "Perfil",
    subscription: "Suscripción",
    ecommerce: "Comercio",
    insights: "Insights de IA",
    places: "Lugares y Matchmaking",
    communication: "Comunicación",
    marketing: "Marketing automatizado",
    security: "Seguridad y Privacidad",
    operations: "Operaciones",
    kycRequired: "Se requiere KYC completo para funciones de pago.",
    save: "Guardar",
    purchase: "Comprar",
    send: "Enviar",
    completeKyc: "Completar KYC",
    tierBasic: "Básico",
    tierPremium: "Premium",
    tierEnterprise: "Empresarial"
  }
};

function withFallback(
  baseDictionary: DashboardDictionary,
  targetLanguage: string
): LocalizationTranslationResult {
  const fallback = FALLBACK_TRANSLATIONS[targetLanguage];
  if (!fallback) {
    return {
      dictionary: baseDictionary,
      provider: "identity",
      targetLanguage
    };
  }
  return {
    dictionary: {
      ...baseDictionary,
      ...fallback
    },
    provider: "localization-fallback",
    targetLanguage
  };
}

function normalizeBaseUrl(url: string): string {
  return url.endsWith("/") ? url.slice(0, -1) : url;
}

function getCsiGatewayEndpoint(): string {
  return (
    process.env.PULSCO_CSI_GATEWAY_URL ||
    process.env.PULSCO_EDGE_GATEWAY_URL ||
    process.env.PULSCO_MARP_FIREWALL_URL ||
    ""
  );
}

async function tryLocalizationServiceBatch(
  baseUrl: string,
  sourceLanguage: string,
  targetLanguage: string,
  entries: TranslationEntry[]
): Promise<DashboardDictionary | null> {
  const endpoints = [
    `${normalizeBaseUrl(baseUrl)}/translate/batch`,
    `${normalizeBaseUrl(baseUrl)}/api/v1/localization/translate/batch`,
    `${normalizeBaseUrl(baseUrl)}/translate`
  ];

  for (const endpoint of endpoints) {
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-pulsco-source-app": "@pulsco/pulse-connect-ui"
        },
        cache: "no-store",
        body: JSON.stringify({
          sourceLanguage,
          targetLanguage,
          texts: entries.map((entry) => entry.text),
          domain: "ui",
          quality: "standard"
        })
      });

      if (!response.ok) {
        continue;
      }

      const payload = (await response.json().catch(() => ({}))) as Record<string, unknown>;
      const translatedTexts = Array.isArray(payload.translatedTexts)
        ? payload.translatedTexts
        : Array.isArray(payload.translations)
          ? (payload.translations as Array<Record<string, unknown>>).map((entry) =>
              String(entry.translatedText || entry.text || "")
            )
          : [];

      if (!translatedTexts.length) {
        continue;
      }

      const dictionary = {} as DashboardDictionary;
      entries.forEach((entry, index) => {
        dictionary[entry.key] = translatedTexts[index] || entry.text;
      });

      return dictionary;
    } catch {
      // Continue to next endpoint.
    }
  }

  return null;
}

async function tryCsiServiceBatch(
  sourceLanguage: string,
  targetLanguage: string,
  entries: TranslationEntry[]
): Promise<DashboardDictionary | null> {
  const endpoint = getCsiGatewayEndpoint();
  if (!endpoint) {
    return null;
  }

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-csi-reason-code": "CSI_GATEWAY_ACCESS",
        "x-pulsco-source-app": "@pulsco/pulse-connect-ui"
      },
      cache: "no-store",
      body: JSON.stringify({
        subsystem: "localization",
        action: "translate.batch",
        context: {
          sourceLanguage,
          targetLanguage,
          texts: entries.map((entry) => entry.text),
          domain: "ui"
        }
      })
    });

    if (!response.ok) {
      return null;
    }

    const payload = (await response.json().catch(() => ({}))) as Record<string, unknown>;
    const translatedTexts = Array.isArray(payload.translatedTexts)
      ? payload.translatedTexts
      : Array.isArray(payload.translations)
        ? (payload.translations as Array<Record<string, unknown>>).map((entry) =>
            String(entry.translatedText || entry.text || "")
          )
        : Array.isArray(payload.data)
          ? (payload.data as Array<Record<string, unknown>>).map((entry) =>
              String(entry.translatedText || entry.text || "")
            )
          : [];

    if (!translatedTexts.length) {
      return null;
    }

    const dictionary = {} as DashboardDictionary;
    entries.forEach((entry, index) => {
      dictionary[entry.key] = translatedTexts[index] || entry.text;
    });
    return dictionary;
  } catch {
    return null;
  }
}

async function tryAzureTranslator(
  sourceLanguage: string,
  targetLanguage: string,
  entries: TranslationEntry[]
): Promise<DashboardDictionary | null> {
  const endpoint = process.env.AZURE_TRANSLATOR_ENDPOINT;
  const key = process.env.AZURE_TRANSLATOR_KEY;

  if (!endpoint || !key) {
    return null;
  }

  try {
    const base = normalizeBaseUrl(endpoint);
    const url = new URL(`${base}/translate`);
    url.searchParams.set("api-version", "3.0");
    url.searchParams.set("from", sourceLanguage);
    url.searchParams.set("to", targetLanguage);

    const response = await fetch(url.toString(), {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "Ocp-Apim-Subscription-Key": key,
        ...(process.env.AZURE_TRANSLATOR_REGION
          ? { "Ocp-Apim-Subscription-Region": process.env.AZURE_TRANSLATOR_REGION }
          : {})
      },
      cache: "no-store",
      body: JSON.stringify(entries.map((entry) => ({ text: entry.text })))
    });

    if (!response.ok) {
      return null;
    }

    const payload = (await response.json().catch(() => [])) as Array<Record<string, unknown>>;
    if (!Array.isArray(payload) || payload.length === 0) {
      return null;
    }

    const dictionary = {} as DashboardDictionary;
    entries.forEach((entry, index) => {
      const item = payload[index] as Record<string, unknown> | undefined;
      const translationArray = Array.isArray(item?.translations)
        ? (item?.translations as Array<Record<string, unknown>>)
        : [];
      const translated = translationArray[0]?.text;
      dictionary[entry.key] =
        typeof translated === "string" && translated.trim().length > 0 ? translated : entry.text;
    });

    return dictionary;
  } catch {
    return null;
  }
}

export async function translateDashboardDictionary(
  baseDictionary: DashboardDictionary,
  targetLanguage: string,
  sourceLanguage = "en"
): Promise<LocalizationTranslationResult> {
  if (targetLanguage === sourceLanguage) {
    return {
      dictionary: baseDictionary,
      provider: "identity",
      targetLanguage
    };
  }

  const entries = Object.entries(baseDictionary).map(([key, text]) => ({
    key: key as keyof DashboardDictionary,
    text
  }));

  const localizationApiUrl =
    process.env.PULSCO_LOCALIZATION_API_URL || process.env.LOCALIZATION_API_URL;

  if (localizationApiUrl) {
    const translated = await tryLocalizationServiceBatch(
      localizationApiUrl,
      sourceLanguage,
      targetLanguage,
      entries
    );
    if (translated) {
      return {
        dictionary: translated,
        provider: "localization-service",
        targetLanguage
      };
    }
  }

  // Internal CSI translation advisory path (no external provider dependency).
  const csiTranslated = await tryCsiServiceBatch(sourceLanguage, targetLanguage, entries);
  if (csiTranslated) {
    return {
      dictionary: csiTranslated,
      provider: "csi-localization",
      targetLanguage
    };
  }

  const allowExternalProvider = process.env.ALLOW_EXTERNAL_TRANSLATION_PROVIDER === "true";
  if (allowExternalProvider) {
    const azureTranslated = await tryAzureTranslator(sourceLanguage, targetLanguage, entries);
    if (azureTranslated) {
      return {
        dictionary: azureTranslated,
        provider: "azure-translator",
        targetLanguage
      };
    }
  }

  return withFallback(baseDictionary, targetLanguage);
}
