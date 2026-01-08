import { Module } from '@nestjs/common';
import { ArbitrationController } from './controllers/arbitration.controller';
import { ArbitrationService } from './services/arbitration.service';
import { PC365Guard } from '../../../shared/lib/src/pc365Guard';

@Module({
  controllers: [ArbitrationController],
  providers: [
    ArbitrationService,
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
  ],
  exports: [ArbitrationService],
})
export class MARPFounderArbitrationModule {}
