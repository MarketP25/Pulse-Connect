import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ThrottlerModule } from "@nestjs/throttler";
import { ClientProxyFactory, Transport } from "@nestjs/microservices";
import { Pool } from "pg";
import { EdgeGatewayController } from "./controllers/edge-gateway.controller";
import { EdgeGatewayService } from "./services/edge-gateway.service";
import { SignatureVerifierService } from "./services/signature-verifier.service";
import { PolicyCacheService } from "./services/policy-cache.service";
import { ExecutionEngineService } from "./services/execution-engine.service";
import { TelemetryService } from "./services/telemetry.service";
import { BrandSupportService } from "./services/brand-support.service";
import { CrossModuleEnrichmentService } from "./services/cross-module-enrichment.service";
import { SubsystemAdapterRegistryService } from "./services/subsystem-adapter-registry.service";
import { EcommerceAdapter } from "./adapters/ecommerce.adapter";
import { BillingAdapter } from "./adapters/billing.adapter";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [".env.local", ".env"]
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000, // 1 minute
        limit: 100 // requests per ttl
      }
    ])
  ],
  controllers: [EdgeGatewayController],
  providers: [
    {
      provide: "DATABASE_CONNECTION",
      useFactory: () => {
        const connectionString = process.env.POSTGRES_URL || process.env.DATABASE_URL || "";
        return new Pool({
          connectionString,
          max: Number(process.env.POSTGRES_POOL_SIZE || 10),
          idleTimeoutMillis: 30_000
        });
      }
    },
    {
      provide: "KAFKA_CLIENT",
      useFactory: () => {
        const brokers = (process.env.KAFKA_BROKERS || process.env.KAFKA_URL || "")
          .split(",")
          .map((entry) => entry.trim())
          .filter(Boolean);

        if (brokers.length === 0) {
          return {
            emit: async () => undefined,
            send: async () => undefined
          };
        }

        return ClientProxyFactory.create({
          transport: Transport.KAFKA,
          options: {
            client: {
              clientId: process.env.KAFKA_CLIENT_ID || "edge-gateway",
              brokers
            },
            consumer: {
              groupId: process.env.KAFKA_CONSUMER_GROUP || "edge-gateway-consumers"
            }
          }
        });
      }
    },
    EdgeGatewayService,
    SignatureVerifierService,
    PolicyCacheService,
    ExecutionEngineService,
    TelemetryService,
    CrossModuleEnrichmentService,
    SubsystemAdapterRegistryService,
    EcommerceAdapter,
    BillingAdapter,
    BrandSupportService
  ],
  exports: [EdgeGatewayService]
})
export class EdgeGatewayModule {}
