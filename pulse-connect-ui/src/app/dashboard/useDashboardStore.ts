"use client";

import { create } from "zustand";
import {
  DashboardSnapshot,
  DashboardTier,
  DashboardRole,
  SupportedDashboardLanguage,
  ConsentSettings,
  DashboardAiStatus
} from "@/types/dashboard";

type DashboardState = {
  userId: string;
  snapshot: DashboardSnapshot | null;
  loading: boolean;
  saving: boolean;
  error: string | null;
  chatResponse: string;
  aiStatus: DashboardAiStatus | null;
  setUserId: (userId: string) => void;
  bootstrap: (userId?: string) => Promise<void>;
  saveOnboarding: (payload: {
    role?: DashboardRole;
    preferredLanguage?: SupportedDashboardLanguage;
    referralCode?: string;
  }) => Promise<void>;
  saveProfile: (payload: {
    displayName?: string;
    role?: DashboardRole;
    preferredLanguage?: SupportedDashboardLanguage;
    country?: string;
    city?: string;
  }) => Promise<void>;
  changeTier: (tier: DashboardTier) => Promise<void>;
  completeKyc: (approved?: boolean) => Promise<void>;
  purchaseProduct: (productId: string) => Promise<void>;
  askChatbot: (prompt: string) => Promise<void>;
  loadExtendedModules: () => Promise<void>;
  enableTwoFactor: () => Promise<void>;
  runBillingAction: (
    action: "create" | "renew" | "upgrade" | "cancel",
    payload?: Record<string, unknown>
  ) => Promise<void>;
  runPlacesAction: (
    action: "create_place" | "create_booking" | "cancel_booking",
    payload: Record<string, unknown>
  ) => Promise<void>;
  runMatchmakingAction: (
    action: "create_brief" | "submit_proposal" | "create_contract",
    payload: Record<string, unknown>
  ) => Promise<void>;
  runGovernanceAction: (
    action: "request_arbitration" | "review_recommendation",
    payload?: Record<string, unknown>
  ) => Promise<void>;
  updateSecurity: (consents: Partial<ConsentSettings>) => Promise<void>;
  trackInteraction: (
    module: string,
    eventType: string,
    metadata?: Record<string, string | number | boolean>
  ) => Promise<void>;
};

async function requestJson<T>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
  const response = await fetch(input, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(init?.headers || {})
    },
    cache: "no-store"
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.message || `Request failed with status ${response.status}`);
  }

  return response.json() as Promise<T>;
}

function userQuery(userId: string): string {
  return `?userId=${encodeURIComponent(userId)}`;
}

function mergeSnapshotPatch(
  current: DashboardSnapshot | null,
  patch: Partial<DashboardSnapshot>
): DashboardSnapshot | null {
  if (!current) {
    return null;
  }

  return {
    ...current,
    ...patch
  };
}

export const useDashboardStore = create<DashboardState>((set, get) => ({
  userId: "demo-basic",
  snapshot: null,
  loading: false,
  saving: false,
  error: null,
  chatResponse: "",
  aiStatus: null,

  setUserId: (userId) => set({ userId }),

  bootstrap: async (inputUserId) => {
    const userId = inputUserId || get().userId;
    set({ loading: true, error: null, userId });

    try {
      const snapshot = await requestJson<DashboardSnapshot>(
        `/api/dashboard/bootstrap${userQuery(userId)}`
      );
      set({ snapshot, loading: false, error: null, aiStatus: snapshot.aiStatus || null });
      await get().loadExtendedModules();
    } catch (error) {
      set({
        loading: false,
        error: error instanceof Error ? error.message : "Failed to load dashboard"
      });
    }
  },

  saveOnboarding: async (payload) => {
    const userId = get().userId;
    set({ saving: true, error: null });

    try {
      await requestJson(`/api/dashboard/onboarding${userQuery(userId)}`, {
        method: "POST",
        body: JSON.stringify(payload)
      });
      await get().bootstrap(userId);
    } catch (error) {
      set({ error: error instanceof Error ? error.message : "Failed to save onboarding" });
    } finally {
      set({ saving: false });
    }
  },

  saveProfile: async (payload) => {
    const userId = get().userId;
    set({ saving: true, error: null });

    try {
      await requestJson(`/api/dashboard/profile${userQuery(userId)}`, {
        method: "PATCH",
        body: JSON.stringify(payload)
      });
      await get().bootstrap(userId);
    } catch (error) {
      set({ error: error instanceof Error ? error.message : "Failed to save profile" });
    } finally {
      set({ saving: false });
    }
  },

  changeTier: async (tier) => {
    const userId = get().userId;
    set({ saving: true, error: null });

    try {
      await requestJson(`/api/dashboard/subscription${userQuery(userId)}`, {
        method: "PATCH",
        body: JSON.stringify({ tier })
      });
      await get().bootstrap(userId);
    } catch (error) {
      set({ error: error instanceof Error ? error.message : "Failed to change tier" });
    } finally {
      set({ saving: false });
    }
  },

  completeKyc: async (approved = true) => {
    const userId = get().userId;
    set({ saving: true, error: null });

    try {
      await requestJson(`/api/dashboard/kyc${userQuery(userId)}`, {
        method: "POST",
        body: JSON.stringify({ approved })
      });
      await get().bootstrap(userId);
    } catch (error) {
      set({ error: error instanceof Error ? error.message : "Failed to complete KYC" });
    } finally {
      set({ saving: false });
    }
  },

  purchaseProduct: async (productId) => {
    const userId = get().userId;
    set({ saving: true, error: null });

    try {
      await requestJson(`/api/dashboard/ecommerce${userQuery(userId)}`, {
        method: "POST",
        body: JSON.stringify({ productId })
      });
      await get().bootstrap(userId);
    } catch (error) {
      set({ error: error instanceof Error ? error.message : "Purchase failed" });
    } finally {
      set({ saving: false });
    }
  },

  askChatbot: async (prompt) => {
    const userId = get().userId;
    set({ saving: true, error: null });

    try {
      const data = await requestJson<{ response: string; aiStatus?: DashboardAiStatus }>(
        `/api/dashboard/communication${userQuery(userId)}`,
        {
          method: "POST",
          body: JSON.stringify({ prompt })
        }
      );
      set({ chatResponse: data.response, aiStatus: data.aiStatus || get().aiStatus });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : "Chat request failed" });
    } finally {
      set({ saving: false });
    }
  },

  loadExtendedModules: async () => {
    const userId = get().userId;
    const endpoints = [
      `/api/dashboard/reporting${userQuery(userId)}`,
      `/api/dashboard/fraud${userQuery(userId)}`,
      `/api/dashboard/identity${userQuery(userId)}`,
      `/api/dashboard/billing${userQuery(userId)}`,
      `/api/dashboard/places-ops${userQuery(userId)}`,
      `/api/dashboard/matchmaking-ops${userQuery(userId)}`,
      `/api/dashboard/governance${userQuery(userId)}`,
      `/api/dashboard/localization-advanced${userQuery(userId)}`,
      `/api/dashboard/proximity-advanced${userQuery(userId)}`
    ];

    const settled = await Promise.allSettled(
      endpoints.map((endpoint) => requestJson<Record<string, unknown>>(endpoint))
    );
    const patch: Partial<DashboardSnapshot> = {};

    for (const result of settled) {
      if (result.status !== "fulfilled" || !result.value || typeof result.value !== "object") {
        continue;
      }
      Object.assign(patch, result.value);
    }

    set((state) => ({
      snapshot: mergeSnapshotPatch(state.snapshot, patch)
    }));
  },

  enableTwoFactor: async () => {
    const userId = get().userId;
    set({ saving: true, error: null });
    try {
      const result = await requestJson<Record<string, unknown>>(
        `/api/dashboard/identity${userQuery(userId)}`,
        {
          method: "POST",
          body: JSON.stringify({ action: "enable_2fa" })
        }
      );
      set((state) => ({
        snapshot: mergeSnapshotPatch(state.snapshot, result as Partial<DashboardSnapshot>)
      }));
      await get().bootstrap(userId);
    } catch (error) {
      set({ error: error instanceof Error ? error.message : "Failed to enable 2FA" });
    } finally {
      set({ saving: false });
    }
  },

  runBillingAction: async (action, payload) => {
    const userId = get().userId;
    set({ saving: true, error: null });
    try {
      const result = await requestJson<Record<string, unknown>>(
        `/api/dashboard/billing${userQuery(userId)}`,
        {
          method: "POST",
          body: JSON.stringify({ action, payload })
        }
      );
      set((state) => ({
        snapshot: mergeSnapshotPatch(state.snapshot, result as Partial<DashboardSnapshot>)
      }));
      await get().bootstrap(userId);
    } catch (error) {
      set({ error: error instanceof Error ? error.message : "Billing action failed" });
    } finally {
      set({ saving: false });
    }
  },

  runPlacesAction: async (action, payload) => {
    const userId = get().userId;
    set({ saving: true, error: null });
    try {
      const result = await requestJson<Record<string, unknown>>(
        `/api/dashboard/places-ops${userQuery(userId)}`,
        {
          method: "POST",
          body: JSON.stringify({ action, payload })
        }
      );
      set((state) => ({
        snapshot: mergeSnapshotPatch(state.snapshot, result as Partial<DashboardSnapshot>)
      }));
      await get().loadExtendedModules();
    } catch (error) {
      set({ error: error instanceof Error ? error.message : "Places operation failed" });
    } finally {
      set({ saving: false });
    }
  },

  runMatchmakingAction: async (action, payload) => {
    const userId = get().userId;
    set({ saving: true, error: null });
    try {
      const result = await requestJson<Record<string, unknown>>(
        `/api/dashboard/matchmaking-ops${userQuery(userId)}`,
        {
          method: "POST",
          body: JSON.stringify({ action, payload })
        }
      );
      set((state) => ({
        snapshot: mergeSnapshotPatch(state.snapshot, result as Partial<DashboardSnapshot>)
      }));
      await get().loadExtendedModules();
    } catch (error) {
      set({ error: error instanceof Error ? error.message : "Matchmaking operation failed" });
    } finally {
      set({ saving: false });
    }
  },

  runGovernanceAction: async (action, payload) => {
    const userId = get().userId;
    set({ saving: true, error: null });
    try {
      const result = await requestJson<Record<string, unknown>>(
        `/api/dashboard/governance${userQuery(userId)}`,
        {
          method: "POST",
          body: JSON.stringify({
            action,
            recommendationId: payload?.recommendationId,
            decision: payload?.decision
          })
        }
      );
      set((state) => ({
        snapshot: mergeSnapshotPatch(state.snapshot, result as Partial<DashboardSnapshot>)
      }));
      await get().loadExtendedModules();
    } catch (error) {
      set({ error: error instanceof Error ? error.message : "Governance action failed" });
    } finally {
      set({ saving: false });
    }
  },

  updateSecurity: async (consents) => {
    const userId = get().userId;
    set({ saving: true, error: null });

    try {
      await requestJson(`/api/dashboard/security${userQuery(userId)}`, {
        method: "PATCH",
        body: JSON.stringify({ consents })
      });
      await get().bootstrap(userId);
    } catch (error) {
      set({ error: error instanceof Error ? error.message : "Failed to update security settings" });
    } finally {
      set({ saving: false });
    }
  },

  trackInteraction: async (module, eventType, metadata) => {
    const userId = get().userId;

    try {
      await requestJson(`/api/dashboard/interactions${userQuery(userId)}`, {
        method: "POST",
        body: JSON.stringify({ module, eventType, metadata })
      });
    } catch {
      // Telemetry should not break the UX.
    }
  }
}));
