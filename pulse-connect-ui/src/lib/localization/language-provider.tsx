"use client";

import React, { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { getCookie, setCookie } from "@/lib/utils/cookies";

interface LanguageContextType {
  language: string;
  setLanguage: (lang: string) => void;
  region?: string;
  setRegion: (region: string) => void;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

interface LanguageProviderProps {
  children: ReactNode;
  defaultLanguage?: string;
}

export function LanguageProvider({ children, defaultLanguage = "en" }: LanguageProviderProps) {
  const [language, setLanguageState] = useState<string>(defaultLanguage);
  const [region, setRegionState] = useState<string | undefined>();

  // Initialize from cookie on mount
  useEffect(() => {
    const cookieLang = getCookie("preferred_language");
    const cookieRegion = getCookie("preferred_region");

    if (cookieLang) {
      setLanguageState(cookieLang);
    }
    if (cookieRegion) {
      setRegionState(cookieRegion);
    }
  }, []);

  // Update document language when language changes
  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.lang = language;
    }
  }, [language]);

  const setLanguage = (lang: string) => {
    setLanguageState(lang);
    setCookie("preferred_language", lang, { maxAge: 365 * 24 * 60 * 60 }); // 1 year
  };

  const setRegion = (newRegion: string) => {
    setRegionState(newRegion);
    setCookie("preferred_region", newRegion, { maxAge: 365 * 24 * 60 * 60 }); // 1 year
  };

  const value: LanguageContextType = {
    language,
    setLanguage,
    region,
    setRegion
  };

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}

// Utility hook for getting language info
export function useLanguageInfo() {
  const { language, region } = useLanguage();
  return {
    language,
    region,
    locale: region ? `${language}-${region}` : language
  };
}
