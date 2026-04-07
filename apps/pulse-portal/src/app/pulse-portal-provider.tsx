"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

type PulsePortalUser = {
  id: string;
  name: string;
} | null;

type PulsePortalContextType = {
  isConnected: boolean;
  user: PulsePortalUser;
  isAuthenticated: boolean;
  connect: () => Promise<void>;
  disconnect: () => void;
  login: () => void;
};

const PulsePortalContext = createContext<PulsePortalContextType>({
  isConnected: false,
  user: null,
  isAuthenticated: false,
  connect: async () => {},
  disconnect: () => {},
  login: () => {}
});

export function usePulsePortal() {
  const context = useContext(PulsePortalContext);
  if (!context) {
    throw new Error("usePulsePortal must be used within PulsePortalProvider");
  }
  return context;
}

type PulsePortalProviderProps = {
  children: ReactNode;
};

export function PulsePortalProvider({ children }: PulsePortalProviderProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [user, setUser] = useState<PulsePortalUser>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // Check session cookie or localStorage
    const sessionToken = document.cookie
      .split("; ")
      .find((row) => row.startsWith("pulse-portal-session="))
      ?.split("=")[1];

    const localSession = localStorage.getItem("pulse-portal-session");

    const hasSession = sessionToken || localSession;

    setIsAuthenticated(!!hasSession);

    if (hasSession) {
      setIsConnected(true);
      setUser({ id: "user-123", name: "Authenticated User" });
    } else {
      // Portal bootstrapping only; no auth/financial state is stored here.
      setIsConnected(true);
    }
  }, []);

  const connect = async () => {
    setIsConnected(true);
  };

  const disconnect = () => {
    setIsConnected(false);
    setUser(null);
    setIsAuthenticated(false);
    document.cookie = "pulse-portal-session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    localStorage.removeItem("pulse-portal-session");
  };

  const login = () => {
    // Simulate login - set session
    const token = `auth-${Date.now()}`;
    document.cookie = `pulse-portal-session=${token}; path=/; max-age=86400; SameSite=Strict`;
    localStorage.setItem("pulse-portal-session", token);
    setIsAuthenticated(true);
    setUser({ id: token, name: "Portal User" });
  };

  return (
    <PulsePortalContext.Provider
      value={{ isConnected, user, isAuthenticated, connect, disconnect, login }}
    >
      {children}
    </PulsePortalContext.Provider>
  );
}

export default PulsePortalProvider;
