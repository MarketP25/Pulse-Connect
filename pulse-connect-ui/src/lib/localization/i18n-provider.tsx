"use client";

import React, { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useLanguage } from "./language-provider";

interface TranslationDictionary {
  [key: string]: string | TranslationDictionary;
}

interface I18nContextType {
  t: (key: string, fallback?: string) => string;
  language: string;
  isLoading: boolean;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

// Base English translations - comprehensive for the app
const BASE_TRANSLATIONS: TranslationDictionary = {
  // Common UI
  common: {
    save: "Save",
    cancel: "Cancel",
    delete: "Delete",
    edit: "Edit",
    add: "Add",
    remove: "Remove",
    search: "Search",
    filter: "Filter",
    loading: "Loading...",
    error: "Error",
    success: "Success",
    warning: "Warning",
    info: "Information",
    confirm: "Confirm",
    back: "Back",
    next: "Next",
    previous: "Previous",
    close: "Close",
    open: "Open",
    yes: "Yes",
    no: "No"
  },

  // Navigation
  nav: {
    home: "Home",
    dashboard: "Dashboard",
    profile: "Profile",
    settings: "Settings",
    logout: "Logout",
    login: "Login",
    signup: "Sign Up"
  },

  // Auth
  auth: {
    email: "Email",
    password: "Password",
    confirmPassword: "Confirm Password",
    forgotPassword: "Forgot Password?",
    rememberMe: "Remember Me",
    login: "Log In",
    signup: "Sign Up",
    createAccount: "Create Account",
    welcome: "Welcome",
    welcomeBack: "Welcome Back",
    signInToAccount: "Sign in to your account",
    createNewAccount: "Create a new account"
  },

  // Dashboard
  dashboard: {
    title: "Dashboard",
    subtitle: "Your workspace overview",
    welcome: "Welcome to your dashboard"
  },

  // Forms
  forms: {
    required: "Required",
    optional: "Optional",
    submit: "Submit",
    reset: "Reset",
    validation: {
      emailRequired: "Email is required",
      emailInvalid: "Please enter a valid email",
      passwordRequired: "Password is required",
      passwordMinLength: "Password must be at least 8 characters",
      passwordMismatch: "Passwords do not match"
    }
  },

  // Languages
  languages: {
    selectLanguage: "Select Language",
    selectRegion: "Select Region",
    preferredLanguage: "Preferred Language",
    preferredRegion: "Preferred Region"
  }
};

interface I18nProviderProps {
  children: ReactNode;
}

export function I18nProvider({ children }: I18nProviderProps) {
  const { language } = useLanguage();
  const [translations, setTranslations] = useState<TranslationDictionary>(BASE_TRANSLATIONS);
  const [isLoading, setIsLoading] = useState(false);

  // Load translations for the current language
  useEffect(() => {
    if (language === "en") {
      setTranslations(BASE_TRANSLATIONS);
      return;
    }

    setIsLoading(true);

    // In a real app, this would fetch from an API
    // For now, we'll simulate loading and fall back to English
    const loadTranslations = async () => {
      try {
        // Simulate API call delay
        await new Promise((resolve) => setTimeout(resolve, 100));

        // For demo purposes, we'll create a simple translated version
        // In production, this would come from your translation service
        const translated: TranslationDictionary = {
          ...BASE_TRANSLATIONS,
          auth: {
            ...(BASE_TRANSLATIONS.auth as TranslationDictionary),
            welcome:
              language === "es"
                ? "Bienvenido"
                : language === "fr"
                  ? "Bienvenue"
                  : language === "de"
                    ? "Willkommen"
                    : language === "zh"
                      ? "欢迎"
                      : language === "ja"
                        ? "ようこそ"
                        : language === "ar"
                          ? "مرحباً"
                          : (BASE_TRANSLATIONS.auth as TranslationDictionary).welcome
          },
          dashboard: {
            ...(BASE_TRANSLATIONS.dashboard as TranslationDictionary),
            title:
              language === "es"
                ? "Panel de Control"
                : language === "fr"
                  ? "Tableau de Bord"
                  : language === "de"
                    ? "Dashboard"
                    : language === "zh"
                      ? "仪表板"
                      : language === "ja"
                        ? "ダッシュボード"
                        : language === "ar"
                          ? "لوحة التحكم"
                          : (BASE_TRANSLATIONS.dashboard as TranslationDictionary).title
          }
        };

        setTranslations(translated);
      } catch (error) {
        console.warn(`Failed to load translations for ${language}, using English fallback`);
        setTranslations(BASE_TRANSLATIONS);
      } finally {
        setIsLoading(false);
      }
    };

    loadTranslations();
  }, [language]);

  // Translation function
  const t = (key: string, fallback?: string): string => {
    const keys = key.split(".");
    let current: any = translations;

    for (const k of keys) {
      if (current && typeof current === "object" && k in current) {
        current = current[k];
      } else {
        return fallback || key;
      }
    }

    return typeof current === "string" ? current : fallback || key;
  };

  const value: I18nContextType = {
    t,
    language,
    isLoading
  };

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useTranslation() {
  const context = useContext(I18nContext);
  if (context === undefined) {
    throw new Error("useTranslation must be used within an I18nProvider");
  }
  return context;
}

// Hook for getting translated text with fallback
export function useT() {
  const { t } = useTranslation();
  return t;
}
