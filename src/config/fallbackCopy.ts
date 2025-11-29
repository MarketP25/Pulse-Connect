type Role = "guest" | "viewer" | "editor" | "admin";
type Funding = "user" | "org";
type Lang = "en" | "sw" | "yo" | "ar" | "hi" | "pt";

type FallbackKey = `${Role}-${Funding}-${Lang}`;

export const fallbackCopy: Partial<Record<FallbackKey, string>> = {
  "guest-user-sw": "Boresha mipango yako kufungua ujumbe wa sauti.",
  "editor-user-yo": "Ṣí fidio pẹlu imudojuiwọn ti ara rẹ.",
  "admin-org-hi": "आपकी संस्था वीडियो पोस्टिंग सक्रिय कर सकती है।",
  "viewer-org-ar": "يمكن لمنظمتك تمكين هذه الميزة من خلال خطة متميزة.",
  "editor-user-pt": "Ative chamadas de vídeo com um plano Premium.",
  "guest-org-en": "Your org can enable this feature on your behalf."
  // Add more as needed
};