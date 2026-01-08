import { Module } from '@nestjs/common';
import { MetricsController } from './controllers/metrics.controller';
import { DashboardController } from './controllers/dashboard.controller';
import { MetricsService } from './services/metrics.service';
import { AlertingService } from './services/alerting.service';
import { DashboardService } from './services/dashboard.service';

@Module({
  controllers: [MetricsController, DashboardController],
  providers: [
    MetricsService,
    AlertingService,
    DashboardService,
    {
      provide: 'DATABASE_CONNECTION',
      useFactory: () => {
        // Database connection would be configured here
        return {
          query: async (sql: string, params: any[]) => {
            console.log('DB Query:', sql, params);
            return { rows: [] };
          },
        };
      },
    },
  ],
  exports: [MetricsService, AlertingService, DashboardService],
})
export class MARPObservabilityModule {}
