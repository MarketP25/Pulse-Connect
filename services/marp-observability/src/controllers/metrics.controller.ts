import { Controller, Get, Query } from '@nestjs/common';
import { MetricsService } from '../services/metrics.service';

@Controller('marp/metrics')
export class MetricsController {
  constructor(private readonly metricsService: MetricsService) {}

  @Get('quorum-latency')
  async getQuorumLatency(@Query('council') council?: string) {
    return this.metricsService.getQuorumLatency(council);
  }

  @Get('firewall-actions')
  async getFirewallActionRatios(@Query('timeframe') timeframe: string = '1h') {
    return this.metricsService.getFirewallActionRatios(timeframe);
  }

  @Get('snapshot-freshness')
  async getSnapshotFreshness() {
    return this.metricsService.getSnapshotFreshness();
  }

  @Get('signature-verification-rates')
  async getSignatureVerificationRates(@Query('timeframe') timeframe: string = '1h') {
    return this.metricsService.getSignatureVerificationRates(timeframe);
  }

  @Get('subsystem-health')
  async getSubsystemHealth() {
    return this.metricsService.getSubsystemHealth();
  }

  @Get('conflict-escalations')
  async getConflictEscalations(@Query('timeframe') timeframe: string = '24h') {
    return this.metricsService.getConflictEscalations(timeframe);
  }

  @Get('prometheus')
  async getPrometheusMetrics() {
    return this.metricsService.getPrometheusMetrics();
  }
}
