import { Module, NestModule, MiddlewareConsumer, RequestMethod } from "@nestjs/common";
import { EdgeController } from "./controllers/edge.controller";
import { MarpAuthMiddleware } from "./middleware/marp-auth.middleware";
import { InternalSecretMiddleware } from "./middleware/internal-secret.middleware";
import { AuditService } from "./services/audit.service";
import { SubsystemRouterService } from "./services/subsystem-router.service";
import { TelemetryService } from "./services/telemetry.service";
import { RateLimiterService } from "./services/rate-limiter.service";
import { WalletService } from "./services/wallet.service";
import { DeviceKeyService } from "./services/device-key.service";
import { AiSafetyService } from "./services/ai-safety.service";
import { PC365Guard, createPC365Guard } from "../../../shared/lib/src/pc365Guard";

@Module({
  imports: [],
  controllers: [EdgeController],
  providers: [
    AuditService,
    SubsystemRouterService,
    TelemetryService,
    RateLimiterService,
    WalletService,
    AiSafetyService,
    DeviceKeyService,
    {
      provide: PC365Guard,
      useFactory: () => createPC365Guard()
    }
  ]
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(MarpAuthMiddleware)
      .forRoutes(
        { path: "edge/execute", method: RequestMethod.POST },
        { path: "edge/admin/lift-quarantine", method: RequestMethod.POST }
      );

    consumer
      .apply(InternalSecretMiddleware)
      .forRoutes({ path: "edge/internal/update-policy", method: RequestMethod.POST });
  }
}
