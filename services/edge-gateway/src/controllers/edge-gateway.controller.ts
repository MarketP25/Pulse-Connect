import { Controller, Post, Get, Body, Query, Logger } from '@nestjs/common';
import { EdgeGatewayService } from '../services/edge-gateway.service';
import { ExecuteRequestDto } from '../dto/execute-request.dto';
import { PolicyVersionDto } from '../dto/policy-version.dto';

@Controller()
export class EdgeGatewayController {
  private readonly logger = new Logger(EdgeGatewayController.name);

  constructor(private readonly edgeGatewayService: EdgeGatewayService) {}

  /**
   * Execute policy-governed actions across all subsystems
   * POST /edge/execute
   */
  @Post('execute')
  async execute(@Body() request: ExecuteRequestDto) {
    this.logger.log(`Processing execution request for subsystem: ${request.subsystem}`);

    const result = await this.edgeGatewayService.executeRequest(request);

    this.logger.log(`Execution completed with decision: ${result.decision}`);
    return result;
  }

  /**
   * Get current policy version information
   * GET /edge/policy/version
   */
  @Get('policy/version')
  async getPolicyVersion(@Query() query: PolicyVersionDto) {
    this.logger.log(`Retrieving policy version for subsystem: ${query.subsystem}`);

    return await this.edgeGatewayService.getPolicyVersion(query);
  }

  /**
   * Health check endpoint
   * GET /edge/health
   */
  @Get('health')
  async health() {
    return {
      status: 'healthy',
      service: 'edge-gateway',
      timestamp: new Date().toISOString(),
      governance: 'MARP_ACTIVE',
      resilience: 'LOCAL_READY',
    };
  }
}
