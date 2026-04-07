import { ExecuteRequestDto } from "../dto/execute-request.dto";

export interface AdapterResult {
  success: boolean;
  data?: any;
  error?: string;
  riskFactors: string[];
  metadata?: {
    adapter?: string;
    action?: string;
    timestamp?: string;
    adapterVersion?: string;
    adapterCapabilities?: string[];
    executedAt?: string;
    [key: string]: any;
  };
}

export interface AdapterContext {
  policy?: {
    version: string;
    content: any;
  };
  regionCode?: string;
  instanceId?: string;
  telemetryEnabled?: boolean;
  [key: string]: any;
}

export interface SubsystemAdapter {
  readonly subsystemType: string;

  /**
   * Execute subsystem-specific operations with governance checks
   */
  execute(request: ExecuteRequestDto, context: AdapterContext): Promise<AdapterResult>;
}
