// Environment Configuration Management for Pulsco Admin Governance System

export interface EnvironmentConfig {
  nodeEnv: "development" | "staging" | "production";
  apiBaseUrl: string;
  csiApiUrl: string;
  marpApiUrl: string;
  authSessionDuration: number;
  governance: {
    maxAdmins: number;
    adminEmails: Record<string, string>;
  };
}

export class EnvironmentManager {
  private config: EnvironmentConfig;

  constructor() {
    this.config = {
      nodeEnv: "development",
      apiBaseUrl: process.env.API_BASE_URL || "http://localhost:3000/api",
      csiApiUrl: process.env.CSI_API_URL || "http://localhost:3001/api",
      marpApiUrl: process.env.MARP_API_URL || "http://localhost:3002/api",
      authSessionDuration: 15,
      governance: {
        maxAdmins: 10,
        adminEmails: {
          superadmin: "superadmin@pulsco.global",
          coo: "coo@pulsco.global",
          "business-ops": "business-ops@pulsco.global",
          "people-risk": "people-risk@pulsco.global",
          "procurement-partnerships": "procurement-partnerships@pulsco.global",
          "legal-finance": "legal-finance@pulsco.global",
          "commercial-outreach": "commercial-outreach@pulsco.global",
          "tech-security": "tech-security@pulsco.global",
          "customer-experience": "customer-experience@pulsco.global",
          "governance-registrar": "governance-registrar@pulsco.global",
          dpo: "dpo@pulsco.global"
        }
      }
    };
  }

  getConfig(): EnvironmentConfig {
    return { ...this.config };
  }

  get<T = any>(key: string): T | undefined {
    return this.getNestedValue(this.config, key);
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split(".").reduce((current, key) => current?.[key], obj);
  }
}

export default EnvironmentManager;
