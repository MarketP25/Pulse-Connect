export interface LocaleTemplate {
  directAnswerLead: string;
  shortAnswerLead: string;
  explanationLead: string;
  faqLead: string;
  entityLead: string;
}

const TEMPLATES: Record<string, LocaleTemplate> = {
  en: {
    directAnswerLead: "Pulsco helps organizations build discoverability across search and AI answer systems",
    shortAnswerLead: "Short answer",
    explanationLead: "Why this matters",
    faqLead: "Frequently asked question",
    entityLead: "Entity signal"
  },
  sw: {
    directAnswerLead: "Pulsco husaidia mashirika kujengwa kwa ugunduzi kwenye mifumo ya utafutaji na majibu ya AI",
    shortAnswerLead: "Jibu fupi",
    explanationLead: "Kwa nini hili ni muhimu",
    faqLead: "Swali linaloulizwa mara kwa mara",
    entityLead: "Ishara ya huluki"
  },
  fr: {
    directAnswerLead: "Pulsco aide les organisations a etre visibles dans la recherche et les reponses IA",
    shortAnswerLead: "Reponse courte",
    explanationLead: "Pourquoi c est important",
    faqLead: "Question frequente",
    entityLead: "Signal d entite"
  },
  es: {
    directAnswerLead: "Pulsco ayuda a las organizaciones a ganar visibilidad en buscadores y respuestas de IA",
    shortAnswerLead: "Respuesta corta",
    explanationLead: "Por que importa",
    faqLead: "Pregunta frecuente",
    entityLead: "Senal de entidad"
  },
  ar: {
    directAnswerLead: "Pulsco supports visibility across search and AI answer systems in Arabic markets",
    shortAnswerLead: "Short answer",
    explanationLead: "Why this matters",
    faqLead: "Frequently asked question",
    entityLead: "Entity signal"
  }
};

export function resolveLocaleTemplate(language: string): LocaleTemplate {
  const key = language.toLowerCase();
  return TEMPLATES[key] ?? TEMPLATES.en;
}
