// src/lib/region.ts
export function getBrowserRegion(): string | null {
  if (typeof navigator === "undefined") return null;
  const [, region] = navigator.language.split("-");
  return region?.toUpperCase() ?? null;
}
