import { useContext } from "react";
// Custom hook for consuming theme context
export function useTheme() {
  return useContext(ThemeContext);
}
// src/context/ThemeContext.tsx
import React, { createContext, useEffect, useState, ReactNode } from "react";

interface ThemeContextType {
  theme: "light" | "dark";
  toggle: () => void;
}

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeContext = createContext<ThemeContextType>({
  theme: "light",
  toggle: () => {},
});

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [theme, setTheme] = useState<"light" | "dark">("light");

  // Load stored preference
  useEffect(() => {
    // Only non-sensitive theme preference is stored in localStorage
    const stored = localStorage.getItem("theme") as "light" | "dark" | null;
    if (stored) {
      setTheme(stored);
    }
  }, []);

  // Apply to document and persist
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    // Only non-sensitive theme preference is stored in localStorage
    localStorage.setItem("theme", theme);
  }, [theme]);

  const toggle = () => {
    setTheme((prev) => (prev === "light" ? "dark" : "light"));
  };

  return (
    <ThemeContext.Provider value={{ theme, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}
