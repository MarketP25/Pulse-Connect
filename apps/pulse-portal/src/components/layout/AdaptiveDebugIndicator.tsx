"use client";

import { useAdaptiveLayout } from "@/packages/ui-components";

export function AdaptiveDebugIndicator() {
  const { width, screenClass, isTouch, prefersDark, prefersLight } = useAdaptiveLayout();

  return (
    <div className="fixed bottom-4 right-4 z-[9999] rounded-md bg-black/80 px-3 py-2 text-[11px] text-white backdrop-blur-sm shadow-lg">
      <div className="flex items-center gap-2">
        <span className="font-semibold">Adaptive Mode:</span>
        <span>{screenClass}</span>
      </div>
      <div>W: {width}px</div>
      <div>Touch: {isTouch ? "✔" : "✖"}</div>
      <div>Theme: {prefersDark ? "dark" : prefersLight ? "light" : "auto"}</div>
    </div>
  );
}
