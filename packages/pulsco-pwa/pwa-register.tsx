// @ts-nocheck
"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

const SENSITIVE_PATH_RE = /^\/(billing|wallet|admin|auth|edge|marp)(\/|$)/i;

export type PwaRegisterProps = {
  appId?: string;
  swPath?: string;
  scope?: string;
};

type CSITelemetryPayload = {
  event: string;
  ts?: number;
  path?: string;
  meta?: Record<string, string | number | boolean>;
};

function postToServiceWorker(message: unknown) {
  if (typeof window === "undefined") return;
  if (!("serviceWorker" in navigator)) return;

  try {
    const controller = navigator.serviceWorker.controller;
    if (controller) {
      controller.postMessage(message);
      return;
    }

    // Controller may not exist until after a reload. Best-effort to reach the active SW.
    navigator.serviceWorker.ready
      .then((registration) => registration.active?.postMessage(message))
      .catch(() => {});
  } catch {
    // no-op
  }
}

function sendCsiTelemetry(payload: CSITelemetryPayload) {
  const path = payload.path || "/";
  if (SENSITIVE_PATH_RE.test(path)) return;

  postToServiceWorker({
    type: "CSI_TELEMETRY",
    payload: { ...payload, ts: payload.ts ?? Date.now(), path }
  });
}

function flushCsiTelemetry() {
  postToServiceWorker({ type: "CSI_FLUSH" });
}

export function PwaRegister({
  appId = "pulsco",
  swPath = "/sw.js",
  scope = "/"
}: PwaRegisterProps) {
  const pathname = usePathname();
  const lastPathRef = useRef<string | null>(null);

  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;

    const isSecureContext =
      window.isSecureContext ||
      window.location.protocol === "https:" ||
      window.location.hostname === "localhost";
    if (!isSecureContext) return;

    let cancelled = false;

    (async () => {
      try {
        sendCsiTelemetry({
          event: "pwa_register_start",
          path: window.location.pathname,
          meta: { app_id: appId }
        });

        const registration = await navigator.serviceWorker.register(swPath, { scope });
        if (cancelled) return;

        sendCsiTelemetry({
          event: "pwa_sw_registered",
          path: window.location.pathname,
          meta: { app_id: appId }
        });

        registration.addEventListener("updatefound", () => {
          sendCsiTelemetry({
            event: "pwa_sw_updatefound",
            path: window.location.pathname,
            meta: { app_id: appId }
          });

          const installing = registration.installing;
          if (!installing) return;

          installing.addEventListener("statechange", () => {
            if (installing.state === "installed") {
              sendCsiTelemetry({
                event: "pwa_sw_installed",
                path: window.location.pathname,
                meta: { app_id: appId }
              });
              flushCsiTelemetry();
            }
          });
        });

        await navigator.serviceWorker.ready;
        flushCsiTelemetry();
      } catch {
        // Registration failures should never block app usage
      }
    })();

    const onOnline = () => {
      sendCsiTelemetry({
        event: "online",
        path: window.location.pathname,
        meta: { app_id: appId }
      });
      flushCsiTelemetry();
    };
    const onOffline = () => {
      sendCsiTelemetry({
        event: "offline",
        path: window.location.pathname,
        meta: { app_id: appId }
      });
    };

    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);

    return () => {
      cancelled = true;
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, [appId, scope, swPath]);

  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (typeof window === "undefined") return;
    if (!pathname) return;
    if (lastPathRef.current === pathname) return;

    lastPathRef.current = pathname;
    sendCsiTelemetry({ event: "page_view", path: pathname, meta: { app_id: appId } });
  }, [appId, pathname]);

  return null;
}

export default PwaRegister;
