import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { FirewallService } from '../services/firewall.service';
import { PC365Guard } from '../../../shared/lib/src/pc365Guard';
import {
  CreateFirewallRuleDto,
  FirewallEnforceDto,
  FirewallRuleDto,
  FirewallEnforceResultDto,
  FirewallDirection
} from '../dto/firewall.dto';

@Controller('marp/firewall')
@UseGuards(PC365Guard)
export class FirewallController {
  constructor(private readonly firewallService: FirewallService) {}

  @Get('rules')
  async getActiveRules(
    @Query('subsystem') subsystem?: string,
    @Query('direction') direction?: FirewallDirection,
  ): Promise<FirewallRuleDto[]> {
    return this.firewallService.getActiveRules(subsystem, direction);
  }

  @Post('rules')
  async createRule(
    @Body() dto: CreateFirewallRuleDto,
    // In a real implementation, user ID would come from authenticated context
  ): Promise<FirewallRuleDto> {
    return this.firewallService.createRule(dto, 'marp-admin');
  }

  @Post('enforce')
  async enforceRules(@Body() dto: FirewallEnforceDto): Promise<FirewallEnforceResultDto> {
    return this.firewallService.enforceRules(dto);
  }
}
