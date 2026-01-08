import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { PolicyService } from '../services/policy.service';
import { PC365Guard } from '../../../shared/lib/src/pc365Guard';
import { MARPSignatureMiddleware } from '../middleware/marp-signature.middleware';
import {
  ValidatePolicyDto,
  SignPolicyDto,
  ActivePolicyDto,
  PolicyValidationResultDto,
  PolicySigningResultDto
} from '../dto/policy.dto';

@Controller('marp/policies')
@UseGuards(PC365Guard)
export class PolicyController {
  constructor(private readonly policyService: PolicyService) {}

  @Get('active')
  async getActivePolicies(@Query('subsystem') subsystem?: string): Promise<ActivePolicyDto[]> {
    return this.policyService.getActivePolicies(subsystem);
  }

  @Post('validate')
  async validatePolicy(@Body() dto: ValidatePolicyDto): Promise<PolicyValidationResultDto> {
    return this.policyService.validatePolicy(dto);
  }

  @Post('sign')
  async signPolicy(@Body() dto: SignPolicyDto): Promise<PolicySigningResultDto> {
    return this.policyService.signPolicy(dto);
  }
}
