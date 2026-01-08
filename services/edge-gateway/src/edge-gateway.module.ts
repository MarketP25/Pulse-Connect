import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { EdgeGatewayController } from './controllers/edge-gateway.controller';
import { EdgeGatewayService } from './services/edge-gateway.service';
import { SignatureVerifierService } from './services/signature-verifier.service';
import { PolicyCacheService } from './services/policy-cache.service';
import { ExecutionEngineService } from './services/execution-engine.service';
import { TelemetryService } from './services/telemetry.service';

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
    EdgeGatewayService,
    SignatureVerifierService,
    PolicyCacheService,
    ExecutionEngineService,
    TelemetryService,
  ],
  exports: [EdgeGatewayService],
})
export class EdgeGatewayModule {}
