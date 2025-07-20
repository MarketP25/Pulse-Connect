import React, { createContext, useState, useEffect } from "react";
import type { Session } from "@/types/session";

export const SessionContext = createContext<Session | null>(null);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session>({
    user: {
      id: "u1",
      name: "Charise",
      role: "editor",
      plan: "Premium",
      locale: "sw"
    },
    org: {
      id: "o1",
      name: "PulseOrg",
      plan: null,
      region: "KE"
    }
  });

  useEffect(() => {
    // TODO: Fetch session from auth or API
  }, []);

  return (
    <SessionContext.Provider value={session}>
      {children}
    </SessionContext.Provider>
  );
}