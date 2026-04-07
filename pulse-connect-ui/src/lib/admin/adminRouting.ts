export type AdminRole =
  | "superadmin"
  | "tech-security"
  | "coo"
  | "people-risk"
  | "legal-finance"
  | "governance-registrar"
  | "dpo"
  | "business-ops";

const ROLE_ROUTES: Record<AdminRole, string[]> = {
  superadmin: ["/admin/superadmin", "/admin/emergency", "/admin/intelligence"],
  "tech-security": ["/admin/tech-security", "/admin/intelligence"],
  coo: ["/admin/coo", "/admin/intelligence"],
  "people-risk": ["/admin/people-risk", "/admin/intelligence"],
  "legal-finance": ["/admin/legal-finance", "/admin/intelligence"],
  "governance-registrar": ["/admin/governance-registrar", "/admin/intelligence"],
  dpo: ["/admin/dpo", "/admin/intelligence"],
  "business-ops": ["/admin/business-ops", "/admin/intelligence"]
};

export function getAdminRoutesForRole(role: string | undefined | null): string[] {
  if (!role) return [];
  if (!(role in ROLE_ROUTES)) return [];
  return ROLE_ROUTES[role as AdminRole];
}

export function canAccessAdminRoute(role: string | undefined | null, route: string): boolean {
  const allowed = getAdminRoutesForRole(role);
  if (allowed.length === 0) return false;
  return allowed.some((prefix) => route === prefix || route.startsWith(`${prefix}/`));
}
