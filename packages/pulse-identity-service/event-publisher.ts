import { IdentityEvent } from "./types";

export interface IdentityEventPublisher {
  publish(event: IdentityEvent): Promise<void>;
}

export class NoopIdentityEventPublisher implements IdentityEventPublisher {
  async publish(): Promise<void> {}
}

export class AdminGatewayIdentityEventPublisher implements IdentityEventPublisher {
  private readonly adminGatewayUrl: string;
  private readonly serviceRole: string;
  private readonly attestation: string;

  constructor(
    adminGatewayUrl = process.env.ADMIN_GATEWAY_URL || "http://localhost:3001",
    serviceRole = process.env.IDENTITY_SERVICE_ADMIN_ROLE || "superadmin",
    attestation = process.env.IDENTITY_SERVICE_PC365_ATTESTATION || "identity-service-attestation",
  ) {
    this.adminGatewayUrl = adminGatewayUrl;
    this.serviceRole = serviceRole;
    this.attestation = attestation;
  }

  async publish(event: IdentityEvent): Promise<void> {
    const response = await fetch(`${this.adminGatewayUrl}/api/admin/events`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-admin-role": this.serviceRole,
        "x-pc365-attestation": this.attestation,
      },
      body: JSON.stringify({
        eventType: event.eventType,
        payload: {
          userId: event.userId,
          region: event.region,
          ...event.payload,
        },
        source: "pulse-identity-service",
        timestamp: new Date().toISOString(),
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`failed_to_publish_identity_event:${response.status}:${body}`);
    }
  }
}
