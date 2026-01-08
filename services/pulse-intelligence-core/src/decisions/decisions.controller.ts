import { Controller, Post, Body, Get, Param, Query } from '@nestjs/common';
import { DecisionsService } from './decisions.service';
import { DecisionRequest } from '@pulsco/shared-lib';

@Controller('decisions')
export class DecisionsController {
  constructor(private readonly decisionsService: DecisionsService) {}

  @Post('evaluate')
  async evaluateDecision(@Body() request: DecisionRequest) {
    return await this.decisionsService.evaluateDecision(request);
  }

  @Get('user/:userId')
  async getUserDecisions(@Param('userId') userId: string) {
    return await this.decisionsService.getUserDecisions(userId);
  }

  @Get('stats')
  async getDecisionStats() {
    return await this.decisionsService.getDecisionStats();
  }
}
