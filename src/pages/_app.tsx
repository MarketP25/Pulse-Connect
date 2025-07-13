// src/pages/_app.tsx
import { useState, useEffect } from "react";
import type { AppProps } from "next/app";
import SplashScreen from "@/components/SplashScreen";
import Header from "@/components/Header";
import "@/styles/globals.css";

export default function MyApp({ Component, pageProps }: AppProps) {
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    const id = window.setTimeout(() => setShowSplash(false), 2000);
    return () => clearTimeout(id);
  }, []);

  if (showSplash) {
    return <SplashScreen />;
  }

  return (
    <>
      <Header />
      <Component {...pageProps} />
    </>
  );
}