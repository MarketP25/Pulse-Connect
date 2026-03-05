import {
  AdminGatewayIdentityEventPublisher,
  BillingEngineClient,
  InMemoryIdentityStorageAdapter,
  PulseIdentityService,
} from "@pulsco/pulse-identity-service";
import { InMemoryKycRepository, PulseKycService } from "@pulsco/pulse-kyc-service";

type IdentityContext = {
  service: PulseIdentityService;
};

declare global {
  // eslint-disable-next-line no-var
  var __pulseIdentityContext: IdentityContext | undefined;
}

export function getIdentityService(): PulseIdentityService {
  if (!global.__pulseIdentityContext) {
    const storage = new InMemoryIdentityStorageAdapter();
    const kycService = new PulseKycService(new InMemoryKycRepository());
    global.__pulseIdentityContext = {
      service: new PulseIdentityService(
        {
          storage,
          kycService,
          billingClient: new BillingEngineClient(process.env.BILLING_ENGINE_URL),
          eventPublisher: new AdminGatewayIdentityEventPublisher(process.env.ADMIN_GATEWAY_URL),
        },
        {
          jwtSecret: process.env.PULSE_IDENTITY_JWT_SECRET,
          exposeDebugTokens: process.env.NODE_ENV !== "production",
          autoKycEnabled: true,
        },
      ),
    };
  }

  return global.__pulseIdentityContext.service;
}
