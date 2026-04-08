"use client";

import { useEffect, useState } from "react";
import { useAuthForm } from "@/hooks/useAuthForm";
import { getDefaultRegionForLanguage, isSupportedLanguage, isSupportedRegion } from "@/config/lang";
import { GlobalLocalePicker } from "@/localization/components/GlobalLocalePicker";
import { useLanguage } from "@/lib/localization/language-provider";
import { useT } from "@/lib/localization/i18n-provider";

export default function LoginPage() {
  const { language, region, setLanguage, setRegion } = useLanguage();
  const t = useT();
  const { email, password, error, loading, setEmail, setPassword, handleLogin } = useAuthForm();

  useEffect(() => {
    if (typeof navigator === "undefined") return;

    // Only set browser locale if no language is already set
    if (!language) {
      const browserLocale = navigator.language.split("-")[0].toLowerCase();
      if (browserLocale && isSupportedLanguage(browserLocale)) {
        setLanguage(browserLocale);
        const fallbackRegion = getDefaultRegionForLanguage(browserLocale);
        if (fallbackRegion && isSupportedRegion(fallbackRegion)) {
          setRegion(fallbackRegion);
        }
      }
    }
  }, [language, setLanguage, setRegion]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-100 via-white to-indigo-200 flex items-center justify-center px-4">
      <form
        onSubmit={handleLogin}
        className="w-full max-w-md p-6 bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300"
        aria-label="Login form"
      >
        <div className="text-center mb-6">
          <h1 className="text-3xl font-extrabold text-indigo-700">Pulsco</h1>
          <p className="text-gray-500 text-sm mt-1">Your planetary digital marketing command center</p>
        </div>

        <h2 className="text-2xl font-bold mb-6 text-center">Sign In to Pulsco</h2>

        <input
          id="email"
          type="email"
          placeholder={t("auth.email")}
          value={email}
          autoComplete="email"
          onChange={(e) => setEmail(e.target.value)}
          className="w-full mb-4 px-4 py-2 border rounded"
          required
        />

        <input
          id="password"
          type="password"
          placeholder={t("auth.password")}
          value={password}
          autoComplete="current-password"
          onChange={(e) => setPassword(e.target.value)}
          className="w-full mb-4 px-4 py-2 border rounded"
          required
        />

        <div className="mb-4">
          <h3 className="text-sm font-semibold mb-2 text-slate-600">
            {t("languages.preferredLanguage")}
          </h3>
          <GlobalLocalePicker
            language={language}
            region={region}
            onLanguageChange={(value) => {
              setLanguage(value);
              const defaultRegion = getDefaultRegionForLanguage(value);
              if (defaultRegion && isSupportedRegion(defaultRegion)) {
                setRegion(defaultRegion);
              }
            }}
            onRegionChange={(value) => setRegion(value)}
          />
        </div>

        {error && (
          <p className="text-red-500 text-sm mb-4" role="alert">
            {error}
          </p>
        )}

        <button
          type="submit"
          className="w-full bg-indigo-600 text-white py-2 px-4 rounded hover:bg-indigo-700 disabled:opacity-50"
          disabled={loading}
        >
          {loading ? t("common.loading") : t("auth.login")}
        </button>

        <p className="text-sm text-center mt-4">
          Don’t have an account?{" "}
          <a href="/signup" className="text-blue-600 underline">
            Sign up
          </a>
        </p>
      </form>
    </div>
  );
}
