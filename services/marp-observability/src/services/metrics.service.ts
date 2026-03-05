import { Injectable } from '@nestjs/common';

@Injectable()
export class MetricsService {
  async getMetrics() {
    return {
      cpu: 0,
      memory: 0,
      requests: 0,
      errors: 0,
    };
  }

  async recordMetric(name: string, value: number) {
    console.log(`Recording metric: ${name} = ${value}`);
    return { success: true };
  }
}
