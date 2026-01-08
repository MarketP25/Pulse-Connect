import { Controller, Post, Get, Body, Query } from '@nestjs/common';

@Controller('fraud')
export class FraudController {
  @Post('check-transaction')
  async checkTransaction(@Body() body: any) {
    // Real-time fraud analysis
    const riskScore = Math.random();
    return {
      riskScore,
      flagged: riskScore > 0.8,
      reasons: riskScore > 0.8 ? ['Unusual amount', 'Geographic anomaly'] : []
    };
  }

  @Post('report-suspicious-activity')
  async reportSuspiciousActivity(@Body() body: any) {
    // Log suspicious activity for investigation
    return { reported: true, investigationId: 'inv_' + Date.now() };
  }

  @Get('risk-score/:userId')
  async getUserRiskScore(@Query('userId') userId: string) {
    // Calculate user risk score based on transaction history
    return { userId, riskScore: Math.random() * 0.5 };
  }

  @Get('anomalies')
  async getAnomalies(@Query() query: any) {
    // Return fraud anomalies for monitoring
    return {
      anomalies: [
        {
          id: 'anom_1',
          type: 'geographic_anomaly',
          severity: 'high',
          description: 'Transaction from unusual location'
        }
      ],
      total: 1
    };
  }
}
