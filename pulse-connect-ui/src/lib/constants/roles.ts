export const ROLES = [
  "admin",
  "individual",
  "business",
  "organisation",
  "investor",
  "partner"
] as const;

export type Role = (typeof ROLES)[number];
