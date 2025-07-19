"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { app } from "@/firebase/config";

// Define supported roles
export type PulseConnectRole =
  | "admin"
  | "editor"
  | "viewer"
  | "teamAdmin"
  | "globalAdmin"
  | "guest"
  | null;

interface RoleContextType {
  role: PulseConnectRole;
  org: string | null;
  language: string;
  loading: boolean;
}

const RoleContext = createContext<RoleContextType>({
  role: null,
  org: null,
  language: "en",
  loading: true,
});

export function RoleProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<PulseConnectRole>(null);
  const [org, setOrg] = useState<string | null>(null);
  const [language, setLanguage] = useState("en");
  const [loading, setLoading] = useState(true);
  const auth = getAuth(app);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const tokenResult = await user.getIdTokenResult();

          const claimRole = tokenResult.claims.role;
          const claimOrg = tokenResult.claims.org;

          const resolvedRole =
            typeof claimRole === "string"
              ? (claimRole as PulseConnectRole)
              : "guest";

          const resolvedOrg =
            typeof claimOrg === "string" ? claimOrg : null;

          const browserLang = navigator.language.startsWith("sw")
            ? "sw"
            : "en";

          setRole(resolvedRole);
          setOrg(resolvedOrg);
          setLanguage(browserLang);
        } catch (err) {
          console.error("Error reading claims:", err);
          setRole("guest");
          setOrg(null);
          setLanguage("en");
        }
      } else {
        setRole("guest");
        setOrg(null);
        setLanguage("en");
      }
      setLoading(false);
    });

    return unsubscribe;
  }, [auth]);

  return (
    <RoleContext.Provider value={{ role, org, language, loading }}>
      {children}
    </RoleContext.Provider>
  );
}

// Hook to access role, org, and language anywhere
export const useRole = () => useContext(RoleContext);