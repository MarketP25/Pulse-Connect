import axios from 'axios';

export class AIDecisionClient {
  constructor(private baseUrl: string) {}

  async evaluateKYC(payload: any): Promise<{ decision: string; confidence: number; reason?: string }> {
    const resp = await axios.post(`${this.baseUrl.replace(/\/$/, '')}/evaluate`, payload, {
      timeout: 5000
    });
    return resp.data;
  }
}

export function createAIDecisionClientFromEnv(): AIDecisionClient | null {
  const url = process.env.KYC_DECISION_URL;
  if (!url) return null;
  return new AIDecisionClient(url);
}
