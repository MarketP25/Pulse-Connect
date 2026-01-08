import { Module, MiddlewareConsumer } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { PolicyController } from './controllers/policy.controller';
import { FirewallController } from './controllers/firewall.controller';
import { PolicyService } from './services/policy.service';
import { FirewallService } from './services/firewall.service';
import { PC365Middleware } from './middleware/pc365.middleware';
import { MARPSignatureMiddleware } from './middleware/marp-signature.middleware';
import { PC365Guard } from '../../../shared/lib/src/pc365Guard';
import { PolicyEventEmitter } from './events/policy-events';
import { CouncilEventEmitter } from './events/council-events';

@Module({
  imports: [
    EventEmitterModule.forRoot({
      wildcard: true,
      delimiter: '.',
      newListener: false,
      removeListener: false,
      maxListeners: 20,
      verboseMemoryLeak: false,
      ignoreErrors: false,
    }),
  ],
  controllers: [PolicyController, FirewallController],
  providers: [
    PolicyService,
    FirewallService,
    PolicyEventEmitter,
    CouncilEventEmitter,
    {
      provide: PC365Guard,
      useFactory: () => {
        // Initialize PC365 Guard with environment variables
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
        // Database connection would be configured here
        // This is a placeholder for the actual database connection
        return {
          query: async (sql: string, params: any[]) => {
            console.log('DB Query:', sql, params);
            return { rows: [] };
          },
        };
      },
    },
  ],
  exports: [PolicyService, FirewallService, PC365Guard, PolicyEventEmitter, CouncilEventEmitter],
})
export class MARPGovernanceCoreModule {
  configure(consumer: MiddlewareConsumer) {
    // Apply PC365 middleware to all routes
    consumer.apply(PC365Middleware).forRoutes('*');

    // Apply MARP signature middleware to sensitive routes
    consumer
      .apply(MARPSignatureMiddleware)
      .forRoutes(
        { path: 'policies/active', method: 'GET' },
        { path: 'policies/validate', method: 'POST' },
        { path: 'policies/sign', method: 'POST' },
        { path: 'firewall/rules', method: 'GET' },
        { path: 'firewall/rules', method: 'POST' },
        { path: 'firewall/enforce', method: 'POST' },
      );
  }
}
