import { Module, MiddlewareConsumer } from '@nestjs/common';
import { RoutingController } from './controllers/routing.controller';
import { EnforcementController } from './controllers/enforcement.controller';
import { SubsystemController } from './controllers/subsystem.controller';
import { RoutingService } from './services/routing.service';
import { EnforcementService } from './services/enforcement.service';
import { SubsystemService } from './services/subsystem.service';
import { MARPSignatureMiddleware } from './middleware/marp-signature.middleware';
import { RateLimitMiddleware } from './middleware/rate-limit.middleware';
import { PC365Guard } from '../../../shared/lib/src/pc365Guard';

@Module({
  controllers: [RoutingController, EnforcementController, SubsystemController],
  providers: [
    RoutingService,
    EnforcementService,
    SubsystemService,
    {
      provide: PC365Guard,
      useFactory: () => {
        const config = {
          pc365MasterToken: process.env.PC_365_MASTER_TOKEN || '',
          founderEmail: process.env.FOUNDER_EMAIL || 'superadmin@pulsco.com',
          serviceDeviceFingerprint: process.env.SERVICE_DEVICE_FINGERPRINT || '',
        };
        return new PC365Guard(config);
      },
    },
    {
      provide: 'DATABASE_CONNECTION',
      useFactory: () => {
        return {
          query: async (sql: string, params: any[]) => {
            console.log('DB Query:', sql, params);
            return { rows: [] };
          },
        };
      },
    },
    {
      provide: 'REDIS_CONNECTION',
      useFactory: () => {
        return {
          get: async (key: string) => null,
          set: async (key: string, value: string) => 'OK',
          del: async (key: string) => 1,
        };
      },
    },
  ],
  exports: [RoutingService, EnforcementService, SubsystemService],
})
export class MARPFirewallGatewayModule {
  configure(consumer: MiddlewareConsumer) {
    // Apply rate limiting to all routes
    consumer.apply(RateLimitMiddleware).forRoutes('*');

    // Apply MARP signature middleware to sensitive routes
    consumer
      .apply(MARPSignatureMiddleware)
      .forRoutes(
        { path: 'routing/*', method: 'POST' },
        { path: 'enforcement/*', method: 'POST' },
        { path: 'subsystems/*', method: 'POST' },
      );
  }
}
