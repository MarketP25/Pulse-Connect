import { Controller, Post, Body } from '@nestjs/common';
import { AiEngineService } from '../ai-engine/ai-engine.service';

@Controller('ecommerce/kyc')
export class KycController {
  constructor(private readonly aiEngine: AiEngineService) {}

  @Post('evaluate')
  async evaluate(@Body() body: any) {
    // Accept { kyc, request } shape; use basic heuristics + aiEngine if needed
    const kyc = body.kyc || body.request || {};
    const risk = kyc.risk_score || kyc.riskScore || 50;

    // Simple decisioning thresholds (align with AIComplianceService evaluateKYC)
    if (risk < 40) {
      return { decision: 'approve', confidence: Math.min(0.9, 1 - risk / 100), reason: 'Low risk' };
    }

    if (risk >= 80) {
      return { decision: 'reject', confidence: Math.min(0.95, risk / 100), reason: 'High risk' };
    }

    // For manual cases, optionally call aiEngine to provide additional context
    const analysis = await this.aiEngine.analyzeDecisionContext({ id: 'kyc' }, [JSON.stringify(kyc)]);

    return { decision: 'manual', confidence: 0.5, reason: 'Requires human review', analysis };
  }
}
