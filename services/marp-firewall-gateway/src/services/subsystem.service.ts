import { Injectable, Logger } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';

export interface SubsystemRegistration {
  subsystemName: string;
  subsystemType: string;
  apiEndpoints: string[];
  requiredPermissions: string[];
  routingRules?: Record<string, any>;
  healthCheckUrl?: string;
}

export interface SubsystemStatus {
  subsystemName: string;
  isRegistered: boolean;
  isHealthy: boolean;
  lastHeartbeat?: string;
  registrationToken?: string;
}

@Injectable()
export class SubsystemService {
  private readonly logger = new Logger(SubsystemService.name);

  constructor(
    @Inject('DATABASE_CONNECTION') private readonly db: Pool,
    @Inject('REDIS_CONNECTION') private readonly redis: any,
  ) {}

  async registerSubsystem(registration: SubsystemRegistration): Promise<SubsystemStatus> {
    const registrationToken = uuidv4();

    const query = `
      INSERT INTO subsystem_registry (
        subsystem_name, subsystem_type, api_endpoints, required_permissions,
        routing_rules, health_check_url, registration_token, is_registered
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, true)
      ON CONFLICT (subsystem_name)
      DO UPDATE SET
        subsystem_type = EXCLUDED.subsystem_type,
        api_endpoints = EXCLUDED.api_endpoints,
        required_permissions = EXCLUDED.required_permissions,
        routing_rules = EXCLUDED.routing_rules,
        health_check_url = EXCLUDED.health_check_url,
        registered_at = NOW(),
        last_heartbeat = NOW()
      RETURNING *
    `;

    const values = [
      registration.subsystemName,
      registration.subsystemType,
      JSON.stringify(registration.apiEndpoints),
      JSON.stringify(registration.requiredPermissions),
      JSON.stringify(registration.routingRules || {}),
      registration.healthCheckUrl,
      registrationToken,
    ];

    const result = await this.db.query(query, values);
    const subsystem = result.rows[0];

    this.logger.log(`Subsystem ${registration.subsystemName} registered with token ${registrationToken}`);

    return {
      subsystemName: subsystem.subsystem_name,
      isRegistered: subsystem.is_registered,
      isHealthy: true,
      lastHeartbeat: subsystem.last_heartbeat?.toISOString(),
      registrationToken,
    };
  }

  async getSubsystemStatus(subsystemName: string): Promise<SubsystemStatus> {
    const query = `
      SELECT subsystem_name, is_registered, last_heartbeat, registration_token
      FROM subsystem_registry
      WHERE subsystem_name = $1
    `;

    const result = await this.db.query(query, [subsystemName]);

    if (result.rows.length === 0) {
      return {
        subsystemName,
        isRegistered: false,
        isHealthy: false,
      };
    }

    const subsystem = result.rows[0];
    const isHealthy = await this.checkSubsystemHealth(subsystem);

    return {
      subsystemName: subsystem.subsystem_name,
      isRegistered: subsystem.is_registered,
      isHealthy,
      lastHeartbeat: subsystem.last_heartbeat?.toISOString(),
      registrationToken: subsystem.registration_token,
    };
  }

  async routeSubsystemTraffic(request: {
    subsystemName: string;
    action: string;
    payload: Record<string, any>;
  }): Promise<any> {
    const { subsystemName, action, payload } = request;

    // Check if subsystem is registered
    const status = await this.getSubsystemStatus(subsystemName);
    if (!status.isRegistered) {
      throw new Error(`Subsystem ${subsystemName} is not registered`);
    }

    // Update heartbeat
    await this.updateHeartbeat(subsystemName);

    // Get routing rules
    const routingRules = await this.getSubsystemRoutingRules(subsystemName);

    // Apply routing logic based on action
    const routingResult = this.applyRoutingRules(action, payload, routingRules);

    return {
      subsystemName,
      action,
      routed: true,
      routingResult,
      timestamp: new Date().toISOString(),
    };
  }

  private async checkSubsystemHealth(subsystem: any): Promise<boolean> {
    if (subsystem.health_check_url) {
      // TODO: Implement actual health check via HTTP
      return true;
    }

    // Check heartbeat if no health check URL
    if (!subsystem.last_heartbeat) {
      return false;
    }

    const now = Date.now();
    const lastHeartbeat = new Date(subsystem.last_heartbeat).getTime();
    const heartbeatInterval = subsystem.heartbeat_interval_seconds || 300;
    const gracePeriod = heartbeatInterval * 2 * 1000; // 2x interval in milliseconds

    return (now - lastHeartbeat) <= gracePeriod;
  }

  private async updateHeartbeat(subsystemName: string): Promise<void> {
    const query = `
      UPDATE subsystem_registry
      SET last_heartbeat = NOW()
      WHERE subsystem_name = $1
    `;

    await this.db.query(query, [subsystemName]);
  }

  private async getSubsystemRoutingRules(subsystemName: string): Promise<Record<string, any>> {
    const query = `
      SELECT routing_rules
      FROM subsystem_registry
      WHERE subsystem_name = $1
    `;

    const result = await this.db.query(query, [subsystemName]);
    return result.rows[0]?.routing_rules || {};
  }

  private applyRoutingRules(
    action: string,
    payload: Record<string, any>,
    routingRules: Record<string, any>
  ): any {
    const rule = routingRules[action];

    if (!rule) {
      // Default routing
      return {
        destination: 'default',
        priority: 'normal',
        transformations: [],
      };
    }

    // Apply rule-specific logic
    return {
      destination: rule.destination || 'default',
      priority: rule.priority || 'normal',
      transformations: rule.transformations || [],
      conditions: rule.conditions || {},
    };
  }
}
