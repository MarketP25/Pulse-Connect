"use client";

/**
 * Brand-aware skeleton loader following the Pulsco high-fidelity guidelines.
 * Uses the surface tokens and primary glow for a cohesive "vibe" during loading.
 */
export function BrandSkeleton({ className = "h-4 w-full" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse bg-brand-surface-low shadow-[0_0_10px_var(--brand-glow-low)] rounded-md ${className}`}
    />
  );
}
