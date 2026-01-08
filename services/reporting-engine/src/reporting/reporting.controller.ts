import { Controller, Get, Query } from '@nestjs/common';
import { ReportingService } from './reporting.service';

@Controller('reports')
export class ReportingController {
  constructor(private readonly reportingService: ReportingService) {}

  @Get('revenue/summary')
  async getRevenueSummary(
    @Query('period') period: string,
    @Query('region') region?: string,
    @Query('subsystem') subsystem?: string,
  ) {
    return this.reportingService.getRevenueSummary(period, region, subsystem);
  }

  @Get('revenue/trends')
  async getRevenueTrends(
    @Query('period') period: string,
    @Query('region') region?: string,
  ) {
    return this.reportingService.getRevenueTrends(period, region);
  }

  @Get('performance/latency')
  async getLatencyMetrics(@Query('subsystem') subsystem?: string) {
    return this.reportingService.getLatencyMetrics(subsystem);
  }

  @Get('fraud/anomalies')
  async getFraudAnomalies(
    @Query('region') region?: string,
    @Query('window') window?: string,
  ) {
    return this.reportingService.getFraudAnomalies(region, window);
  }
}
