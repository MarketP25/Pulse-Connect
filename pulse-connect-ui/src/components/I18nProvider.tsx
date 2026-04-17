"use client";

import React, { createContext, useContext } from "react";
import { BrandConfig } from "@/lib/branding";

interface I18nContextType {
  locale: string;
  tone: BrandConfig["localeConfig"]["tone"];
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

export function I18nProvider({
  children,
  config
}: {
  children: React.ReactNode;
  config: BrandConfig["localeConfig"];
}) {
  return <I18nContext.Provider value={config}>{children}</I18nContext.Provider>;
}

export const useI18n = () => {
  const context = useContext(I18nContext);
  if (!context) throw new Error("useI18n must be used within an I18nProvider");
  return context;
};
