import { Controller, Post, Body, Get, Query } from '@nestjs/common';
import { RoutingService } from '../services/routing.service';
import { RouteTrafficDto, RouteResultDto, RoutingRuleDto } from '../dto/routing.dto';

@Controller('marp/routing')
export class RoutingController {
  constructor(private readonly routingService: RoutingService) {}

  @Post('route')
  async routeTraffic(@Body() dto: RouteTrafficDto): Promise<RouteResultDto> {
    return this.routingService.routeTraffic(dto);
  }

  @Get('rules')
  async getRoutingRules(@Query('subsystem') subsystem?: string): Promise<RoutingRuleDto[]> {
    // Return applicable routing rules
    // Implementation would filter rules based on subsystem
    return [];
  }

  @Post('rules')
  async createRoutingRule(@Body() rule: Partial<RoutingRuleDto>): Promise<RoutingRuleDto> {
    // Create a new routing rule
    // Implementation would validate and store the rule
    return {} as RoutingRuleDto;
  }
}
