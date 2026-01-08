import { Controller, Post, Body } from '@nestjs/common';
import { EnforcementService } from '../services/enforcement.service';

@Controller('marp/enforcement')
export class EnforcementController {
  constructor(private readonly enforcementService: EnforcementService) {}

  @Post('enforce')
  async enforceRules(@Body() body: {
    subsystemName: string;
    action: string;
    payload: Record<string, any>;
    context?: Record<string, any>;
  }) {
    return this.enforcementService.enforceRules(body);
  }
}
