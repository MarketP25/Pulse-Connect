export interface SubsystemInfo {
  id: string;
  name: string;
  description: string;
  icon: string;
  status: "online" | "degraded" | "offline";
  health: number;
  regionCount: number;
  userCount: number;
  features: string[];
  endpoints: {
    ui: string;
    api: string;
    health: string;
  };
  dependencies: string[];
  lastUpdated: string;
}

export interface SubsystemHealth {
  id: string;
  status: "online" | "degraded" | "offline";
  health: number;
  responseTime: number;
  lastCheck: string;
  issues: string[];
}

export interface CrossSubsystemIntegration {
  id: string;
  name: string;
  description: string;
  subsystems: string[];
  status: "active" | "inactive" | "error";
  dataFlow: {
    from: string;
    to: string;
    dataType: string;
    frequency: string;
  }[];
  lastSync: string;
}
