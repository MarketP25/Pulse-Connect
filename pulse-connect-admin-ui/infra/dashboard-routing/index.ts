// Dashboard Routing Configuration for Pulsco Admin Governance System
// Handles role-based routing and dashboard access control

import { AdminRoleType } from "@pulsco/admin-shared-types";

export interface RouteConfig {
  path: string;
  component: string;
  roles: AdminRoleType[];
  permissions: string[];
  guards: RouteGuard[];
  metadata: {
    title: string;
    description: string;
    category: "dashboard" | "admin" | "system" | "governance";
    priority: number;
    requiresAuth: boolean;
    cacheable: boolean;
  };
}

export interface RouteGuard {
  type: "auth" | "permission" | "role" | "feature" | "compliance";
  condition: string;
  action: "allow" | "deny" | "redirect";
  redirectTo?: string;
  message?: string;
}

export interface DashboardLayout {
  role: AdminRoleType;
  layout: "single" | "grid" | "tabbed" | "split";
  defaultRoute: string;
  navigation: NavigationConfig;
  theme: ThemeConfig;
  features: FeatureFlags;
}

export interface NavigationConfig {
  sidebar: boolean;
  topbar: boolean;
  breadcrumbs: boolean;
  quickActions: QuickAction[];
  menuItems: MenuItem[];
}

export interface MenuItem {
  id: string;
  label: string;
  path: string;
  icon: string;
  badge?: string;
  children?: MenuItem[];
  permissions: string[];
  featureFlag?: string;
}

export interface QuickAction {
  id: string;
  label: string;
  action: string;
  icon: string;
  permissions: string[];
  priority: number;
}

export interface ThemeConfig {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  mode: "light" | "dark" | "auto";
  fontSize: "small" | "medium" | "large";
  density: "compact" | "comfortable" | "spacious";
}

export interface FeatureFlags {
  realTimeUpdates: boolean;
  exportCapabilities: boolean;
  advancedFilters: boolean;
  customDashboards: boolean;
  alertManagement: boolean;
  auditTrail: boolean;
  complianceOverlay: boolean;
  metricLineage: boolean;
}

export interface RoutingConfig {
  basePath: string;
  defaultRedirect: string;
  errorRoutes: {
    unauthorized: string;
    notFound: string;
    forbidden: string;
  };
  middleware: RouteMiddleware[];
}

export interface RouteMiddleware {
  name: string;
  priority: number;
  handler: (context: RouteContext) => Promise<RouteResult>;
}

export interface RouteContext {
  path: string;
  role: AdminRoleType;
  permissions: string[];
  query: Record<string, string>;
  headers: Record<string, string>;
  session: {
    id: string;
    expiresAt: Date;
    deviceFingerprint: string;
  };
}

export interface RouteResult {
  allow: boolean;
  redirectTo?: string;
  error?: string;
  metadata?: Record<string, any>;
}

export class DashboardRouter {
  private routes: Map<string, RouteConfig> = new Map();
  private layouts: Map<AdminRoleType, DashboardLayout> = new Map();
  private config: RoutingConfig;
  private middleware: RouteMiddleware[] = [];

  constructor(config: RoutingConfig) {
    this.config = config;
    this.initializeRoutes();
    this.initializeLayouts();
    this.initializeMiddleware();
  }

  /**
   * Resolve route for a given path and role
   */
  async resolveRoute(
    path: string,
    role: AdminRoleType,
    context: Partial<RouteContext>
  ): Promise<{
    route?: RouteConfig;
    layout?: DashboardLayout;
    redirectTo?: string;
    error?: string;
  }> {
    // Apply middleware
    for (const mw of this.middleware.sort((a, b) => a.priority - b.priority)) {
      const result = await mw.handler({
        path,
        role,
        permissions: context.permissions || [],
        query: {},
        headers: {},
        session: context.session || {
          id: "",
          expiresAt: new Date(),
          deviceFingerprint: ""
        }
      });

      if (!result.allow) {
        return {
          redirectTo: result.redirectTo || this.config.errorRoutes.forbidden,
          error: result.error
        };
      }
    }

    // Find matching route
    const route = this.findRoute(path);
    if (!route) {
      return {
        redirectTo: this.config.errorRoutes.notFound,
        error: "Route not found"
      };
    }

    // Check role access
    if (!route.roles.includes(role)) {
      return {
        redirectTo: this.config.errorRoutes.unauthorized,
        error: "Insufficient permissions"
      };
    }

    // Apply route guards
    for (const guard of route.guards) {
      if (!this.evaluateGuard(guard, { role, permissions: context.permissions || [] })) {
        if (guard.action === "redirect") {
          return {
            redirectTo: guard.redirectTo || this.config.errorRoutes.forbidden,
            error: guard.message
          };
        }
        return {
          error: guard.message || "Access denied by route guard"
        };
      }
    }

    // Get layout for role
    const layout = this.layouts.get(role);

    return { route, layout };
  }

  /**
   * Get navigation menu for a role
   */
  getNavigationMenu(role: AdminRoleType): MenuItem[] {
    const layout = this.layouts.get(role);
    if (!layout) return [];

    return layout.navigation.menuItems.filter((item) => this.hasPermissionsForMenuItem(item, role));
  }

  /**
   * Get quick actions for a role
   */
  getQuickActions(role: AdminRoleType): QuickAction[] {
    const layout = this.layouts.get(role);
    if (!layout) return [];

    return layout.navigation.quickActions
      .filter((action) => action.permissions.every((perm) => this.hasPermission(role, perm)))
      .sort((a, b) => b.priority - a.priority);
  }

  /**
   * Get available routes for a role
   */
  getAvailableRoutes(role: AdminRoleType): RouteConfig[] {
    return Array.from(this.routes.values()).filter((route) => route.roles.includes(role));
  }

  /**
   * Get dashboard layout for a role
   */
  getDashboardLayout(role: AdminRoleType): DashboardLayout | undefined {
    return this.layouts.get(role);
  }

  /**
   * Update route configuration
   */
  updateRoute(path: string, updates: Partial<RouteConfig>): boolean {
    const route = this.routes.get(path);
    if (!route) return false;

    this.routes.set(path, { ...route, ...updates });
    return true;
  }

  /**
   * Add new route
   */
  addRoute(route: RouteConfig): void {
    this.routes.set(route.path, route);
  }

  /**
   * Remove route
   */
  removeRoute(path: string): boolean {
    return this.routes.delete(path);
  }

  // Private helper methods

  private initializeRoutes(): void {
    const routes: RouteConfig[] = [
      // SuperAdmin routes
      {
        path: "/superadmin",
        component: "superadmin-dashboard",
        roles: ["superadmin"],
        permissions: ["*"],
        guards: [],
        metadata: {
          title: "SuperAdmin Dashboard",
          description: "Global command center with all metrics and controls",
          category: "dashboard",
          priority: 100,
          requiresAuth: true,
          cacheable: false
        }
      },
      {
        path: "/superadmin/metrics",
        component: "superadmin-metrics",
        roles: ["superadmin"],
        permissions: ["metrics:read"],
        guards: [],
        metadata: {
          title: "Global Metrics",
          description: "All system metrics and KPIs",
          category: "dashboard",
          priority: 90,
          requiresAuth: true,
          cacheable: true
        }
      },
      {
        path: "/superadmin/alerts",
        component: "superadmin-alerts",
        roles: ["superadmin"],
        permissions: ["alerts:read", "alerts:manage"],
        guards: [],
        metadata: {
          title: "Global Alerts",
          description: "System-wide alert management",
          category: "system",
          priority: 95,
          requiresAuth: true,
          cacheable: false
        }
      },

      // COO routes
      {
        path: "/coo",
        component: "coo-dashboard",
        roles: ["coo"],
        permissions: ["operations:read"],
        guards: [],
        metadata: {
          title: "COO Dashboard",
          description: "Operational efficiency and performance",
          category: "dashboard",
          priority: 80,
          requiresAuth: true,
          cacheable: false
        }
      },
      {
        path: "/coo/operations",
        component: "coo-operations",
        roles: ["coo"],
        permissions: ["operations:read", "operations:write"],
        guards: [],
        metadata: {
          title: "Operations Management",
          description: "Operational metrics and controls",
          category: "dashboard",
          priority: 75,
          requiresAuth: true,
          cacheable: true
        }
      },

      // Business Operations routes
      {
        path: "/business-ops",
        component: "business-ops-dashboard",
        roles: ["business-ops"],
        permissions: ["business:read"],
        guards: [],
        metadata: {
          title: "Business Operations Dashboard",
          description: "Business performance and KPIs",
          category: "dashboard",
          priority: 70,
          requiresAuth: true,
          cacheable: false
        }
      },
      {
        path: "/business-ops/kpis",
        component: "business-kpis",
        roles: ["business-ops"],
        permissions: ["business:read", "metrics:read"],
        guards: [],
        metadata: {
          title: "Business KPIs",
          description: "Key business performance indicators",
          category: "dashboard",
          priority: 65,
          requiresAuth: true,
          cacheable: true
        }
      },

      // People & Risk routes
      {
        path: "/people-risk",
        component: "people-risk-dashboard",
        roles: ["people-risk"],
        permissions: ["hr:read", "risk:read"],
        guards: [],
        metadata: {
          title: "People & Risk Dashboard",
          description: "HR and risk management",
          category: "dashboard",
          priority: 60,
          requiresAuth: true,
          cacheable: false
        }
      },
      {
        path: "/people-risk/compliance",
        component: "risk-compliance",
        roles: ["people-risk"],
        permissions: ["compliance:read", "compliance:write"],
        guards: [],
        metadata: {
          title: "Risk & Compliance",
          description: "Compliance monitoring and risk assessment",
          category: "governance",
          priority: 55,
          requiresAuth: true,
          cacheable: true
        }
      },

      // Procurement routes
      {
        path: "/procurement",
        component: "procurement-dashboard",
        roles: ["procurement-partnerships"],
        permissions: ["procurement:read"],
        guards: [],
        metadata: {
          title: "Procurement Dashboard",
          description: "Vendor and procurement management",
          category: "dashboard",
          priority: 50,
          requiresAuth: true,
          cacheable: false
        }
      },

      // Legal & Finance routes
      {
        path: "/legal-finance",
        component: "legal-finance-dashboard",
        roles: ["legal-finance"],
        permissions: ["legal:read", "finance:read"],
        guards: [],
        metadata: {
          title: "Legal & Finance Dashboard",
          description: "Legal and financial compliance",
          category: "dashboard",
          priority: 40,
          requiresAuth: true,
          cacheable: false
        }
      },

      // DPO routes
      {
        path: "/dpo",
        component: "dpo-dashboard",
        roles: ["dpo"],
        permissions: ["privacy:read", "audit:read", "compliance:read"],
        guards: [],
        metadata: {
          title: "Data Protection Officer Dashboard",
          description: "Data privacy, compliance, and user rights management",
          category: "governance",
          priority: 38,
          requiresAuth: true,
          cacheable: false
        }
      },

      // Commercial routes
      {
        path: "/commercial",
        component: "commercial-dashboard",
        roles: ["commercial-outreach"],
        permissions: ["marketing:read", "sales:read"],
        guards: [],
        metadata: {
          title: "Commercial Dashboard",
          description: "Market expansion and growth metrics",
          category: "dashboard",
          priority: 30,
          requiresAuth: true,
          cacheable: false
        }
      },

      // Tech & Security routes
      {
        path: "/tech-security",
        component: "tech-security-dashboard",
        roles: ["tech-security"],
        permissions: ["infrastructure:read", "security:read"],
        guards: [],
        metadata: {
          title: "Tech & Security Dashboard",
          description: "Infrastructure and security monitoring",
          category: "dashboard",
          priority: 20,
          requiresAuth: true,
          cacheable: false
        }
      },
      {
        path: "/tech-security/monitoring",
        component: "system-monitoring",
        roles: ["tech-security"],
        permissions: ["monitoring:read", "infrastructure:read"],
        guards: [],
        metadata: {
          title: "System Monitoring",
          description: "Real-time system health and performance",
          category: "system",
          priority: 15,
          requiresAuth: true,
          cacheable: false
        }
      },

      // Customer Experience routes
      {
        path: "/customer-experience",
        component: "customer-experience-dashboard",
        roles: ["customer-experience"],
        permissions: ["customers:read", "support:read"],
        guards: [],
        metadata: {
          title: "Customer Experience Dashboard",
          description: "Customer satisfaction and support metrics",
          category: "dashboard",
          priority: 10,
          requiresAuth: true,
          cacheable: false
        }
      },

      // Governance Registrar routes
      {
        path: "/governance-registrar",
        component: "governance-registrar-dashboard",
        roles: ["governance-registrar"],
        permissions: ["governance:read", "audit:read"],
        guards: [],
        metadata: {
          title: "Governance Registrar Dashboard",
          description: "Governance oversight and audit management",
          category: "governance",
          priority: 5,
          requiresAuth: true,
          cacheable: false
        }
      },
      {
        path: "/governance-registrar/audit",
        component: "audit-management",
        roles: ["governance-registrar"],
        permissions: ["audit:read", "audit:write"],
        guards: [],
        metadata: {
          title: "Audit Management",
          description: "Audit trail and compliance monitoring",
          category: "governance",
          priority: 1,
          requiresAuth: true,
          cacheable: true
        }
      }
    ];

    routes.forEach((route) => {
      this.routes.set(route.path, route);
    });
  }

  private initializeLayouts(): void {
    const layouts: DashboardLayout[] = [
      {
        role: "superadmin",
        layout: "grid",
        defaultRoute: "/superadmin",
        navigation: {
          sidebar: true,
          topbar: true,
          breadcrumbs: true,
          quickActions: [
            {
              id: "global-freeze",
              label: "Freeze All Dashboards",
              action: "freeze-dashboards",
              icon: "freeze",
              permissions: ["admin:freeze"],
              priority: 100
            },
            {
              id: "global-audit",
              label: "Trigger Global Audit",
              action: "trigger-audit",
              icon: "audit",
              permissions: ["audit:trigger"],
              priority: 90
            }
          ],
          menuItems: [
            {
              id: "dashboard",
              label: "Dashboard",
              path: "/superadmin",
              icon: "dashboard",
              permissions: ["*"]
            },
            {
              id: "metrics",
              label: "Global Metrics",
              path: "/superadmin/metrics",
              icon: "metrics",
              permissions: ["metrics:read"]
            },
            {
              id: "alerts",
              label: "Global Alerts",
              path: "/superadmin/alerts",
              icon: "alerts",
              permissions: ["alerts:read"]
            },
            {
              id: "system-health",
              label: "System Health",
              path: "/superadmin/health",
              icon: "health",
              permissions: ["system:read"]
            }
          ]
        },
        theme: {
          primaryColor: "#DC2626", // Red for superadmin
          secondaryColor: "#374151",
          accentColor: "#F59E0B",
          mode: "dark",
          fontSize: "medium",
          density: "comfortable"
        },
        features: {
          realTimeUpdates: true,
          exportCapabilities: true,
          advancedFilters: true,
          customDashboards: true,
          alertManagement: true,
          auditTrail: true,
          complianceOverlay: true,
          metricLineage: true
        }
      },
      {
        role: "coo",
        layout: "single",
        defaultRoute: "/coo",
        navigation: {
          sidebar: true,
          topbar: true,
          breadcrumbs: true,
          quickActions: [
            {
              id: "ops-alert",
              label: "Operations Alert",
              action: "create-ops-alert",
              icon: "alert",
              permissions: ["alerts:create"],
              priority: 80
            }
          ],
          menuItems: [
            {
              id: "dashboard",
              label: "Operations Dashboard",
              path: "/coo",
              icon: "dashboard",
              permissions: ["operations:read"]
            },
            {
              id: "efficiency",
              label: "Efficiency Metrics",
              path: "/coo/efficiency",
              icon: "efficiency",
              permissions: ["metrics:read"]
            },
            {
              id: "resources",
              label: "Resource Management",
              path: "/coo/resources",
              icon: "resources",
              permissions: ["operations:write"]
            }
          ]
        },
        theme: {
          primaryColor: "#2563EB", // Blue
          secondaryColor: "#6B7280",
          accentColor: "#10B981",
          mode: "light",
          fontSize: "medium",
          density: "comfortable"
        },
        features: {
          realTimeUpdates: true,
          exportCapabilities: true,
          advancedFilters: true,
          customDashboards: false,
          alertManagement: true,
          auditTrail: true,
          complianceOverlay: false,
          metricLineage: false
        }
      },
      // Add layouts for other roles similarly...
      {
        role: "business-ops",
        layout: "grid",
        defaultRoute: "/business-ops",
        navigation: {
          sidebar: true,
          topbar: true,
          breadcrumbs: true,
          quickActions: [],
          menuItems: [
            {
              id: "dashboard",
              label: "Business Dashboard",
              path: "/business-ops",
              icon: "dashboard",
              permissions: ["business:read"]
            },
            {
              id: "kpis",
              label: "KPIs",
              path: "/business-ops/kpis",
              icon: "kpi",
              permissions: ["metrics:read"]
            }
          ]
        },
        theme: {
          primaryColor: "#059669", // Green
          secondaryColor: "#6B7280",
          accentColor: "#F59E0B",
          mode: "light",
          fontSize: "medium",
          density: "comfortable"
        },
        features: {
          realTimeUpdates: true,
          exportCapabilities: true,
          advancedFilters: true,
          customDashboards: false,
          alertManagement: false,
          auditTrail: true,
          complianceOverlay: false,
          metricLineage: false
        }
      }
      // Add remaining role layouts...
    ];

    layouts.forEach((layout) => {
      this.layouts.set(layout.role, layout);
    });
  }

  private initializeMiddleware(): void {
    // Authentication middleware
    this.middleware.push({
      name: "auth-check",
      priority: 100,
      handler: async (context) => {
        // Check if user is authenticated
        if (!context.session.id) {
          return {
            allow: false,
            redirectTo: "/login",
            error: "Authentication required"
          };
        }

        // Check session expiry
        if (context.session.expiresAt < new Date()) {
          return {
            allow: false,
            redirectTo: "/login",
            error: "Session expired"
          };
        }

        return { allow: true };
      }
    });

    // Role-based access middleware
    this.middleware.push({
      name: "role-check",
      priority: 90,
      handler: async (context) => {
        const route = this.findRoute(context.path);
        if (!route) {
          return { allow: true }; // Let route resolution handle this
        }

        if (!route.roles.includes(context.role)) {
          return {
            allow: false,
            redirectTo: this.config.errorRoutes.unauthorized,
            error: "Insufficient role permissions"
          };
        }

        return { allow: true };
      }
    });

    // Feature flag middleware
    this.middleware.push({
      name: "feature-check",
      priority: 80,
      handler: async (context) => {
        // Check if required features are enabled for the role
        const layout = this.layouts.get(context.role);
        if (!layout) {
          return { allow: true };
        }

        // Add feature-specific checks here
        return { allow: true };
      }
    });
  }

  private findRoute(path: string): RouteConfig | undefined {
    // Exact match first
    if (this.routes.has(path)) {
      return this.routes.get(path);
    }

    // Pattern matching for dynamic routes
    for (const [routePath, route] of this.routes) {
      if (this.matchRoutePattern(routePath, path)) {
        return route;
      }
    }

    return undefined;
  }

  private matchRoutePattern(pattern: string, path: string): boolean {
    // Simple pattern matching - in real implementation, use a proper router
    const patternParts = pattern.split("/");
    const pathParts = path.split("/");

    if (patternParts.length !== pathParts.length) {
      return false;
    }

    for (let i = 0; i < patternParts.length; i++) {
      const patternPart = patternParts[i];
      const pathPart = pathParts[i];

      if (patternPart.startsWith(":")) {
        // Dynamic parameter
        continue;
      }

      if (patternPart !== pathPart) {
        return false;
      }
    }

    return true;
  }

  private evaluateGuard(
    guard: RouteGuard,
    context: { role: AdminRoleType; permissions: string[] }
  ): boolean {
    switch (guard.type) {
      case "auth":
        return true; // Already handled by middleware
      case "role":
        return guard.condition === context.role;
      case "permission":
        return context.permissions.includes(guard.condition);
      case "feature":
        // Check feature flags
        return true; // Simplified
      case "compliance":
        // Check compliance status
        return true; // Simplified
      default:
        return false;
    }
  }

  private hasPermissionsForMenuItem(item: MenuItem, role: AdminRoleType): boolean {
    return item.permissions.every((perm) => this.hasPermission(role, perm));
  }

  private hasPermission(role: AdminRoleType, permission: string): boolean {
    // In real implementation, check against role policies
    if (role === "superadmin") return true;

    // Simplified permission check
    const rolePermissions: Record<AdminRoleType, string[]> = {
      superadmin: ["*"],
      coo: ["operations:read", "operations:write", "metrics:read"],
      "business-ops": ["business:read", "metrics:read"],
      "people-risk": ["hr:read", "risk:read", "compliance:read"],
      "procurement-partnerships": ["procurement:read", "vendors:read"],
      "legal-finance": ["legal:read", "finance:read", "compliance:read"],
      "commercial-outreach": ["marketing:read", "sales:read"],
      "tech-security": ["infrastructure:read", "security:read", "monitoring:read"],
      "customer-experience": ["customers:read", "support:read"],
      "governance-registrar": ["governance:read", "audit:read"],
      dpo: ["privacy:read", "audit:read", "compliance:read"]
    };

    return (
      rolePermissions[role]?.includes(permission) || rolePermissions[role]?.includes("*") || false
    );
  }
}

export default DashboardRouter;
