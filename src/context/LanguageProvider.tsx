// src/context/LanguageProvider.tsx
import React, { createContext, useContext, useState, useEffect } from "react";

const defaultLang = typeof navigator !== "undefined" ? navigator.language.split("-")[0] : "en";

export const LanguageContext = createContext({
  lang: "en",
  setLang: (l: string) => {},
  t: (key: string) => key,
});

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lang, setLang] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("lang") || defaultLang || "en";
    }
    return "en";
  });
  const [messages, setMessages] = useState<Record<string, string>>({});

  useEffect(() => {
    async function loadLang() {
      try {
        const mod = await import(`@/config/lang/${lang}`);
        setMessages(mod.default);
      } catch {
        const mod = await import("@/config/lang/en");
        setMessages(mod.default);
      }
    }
    loadLang();
    if (typeof window !== "undefined") {
      localStorage.setItem("lang", lang);
    }
  }, [lang]);

  function t(key: string) {
    return messages[key] || key;
  }

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export function useLanguage() {
  return useContext(LanguageContext);
}
