import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { Pool } from 'pg';
import { EdgeGatewayController } from './controllers/edge-gateway.controller';
import { EdgeGatewayService } from './services/edge-gateway.service';
import { SignatureVerifierService } from './services/signature-verifier.service';
import { PolicyCacheService } from './services/policy-cache.service';
import { ExecutionEngineService } from './services/execution-engine.service';
import { TelemetryService } from './services/telemetry.service';
import { BrandSupportService } from './services/brand-support.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000, // 1 minute
        limit: 100, // requests per ttl
      },
    ]),
  ],
  controllers: [EdgeGatewayController],
  providers: [
    {
      provide: 'DATABASE_CONNECTION',
      useFactory: () => {
        const connectionString = process.env.POSTGRES_URL || process.env.DATABASE_URL || '';
        return new Pool({
          connectionString,
          max: Number(process.env.POSTGRES_POOL_SIZE || 10),
          idleTimeoutMillis: 30_000,
        });
      },
    },
    {
      provide: 'KAFKA_CLIENT',
      useFactory: () => ({
        emit: async () => undefined,
        send: async () => undefined,
      }),
    },
    EdgeGatewayService,
    SignatureVerifierService,
    PolicyCacheService,
    ExecutionEngineService,
    TelemetryService,
    BrandSupportService,
  ],
  exports: [EdgeGatewayService],
})
export class EdgeGatewayModule {}
