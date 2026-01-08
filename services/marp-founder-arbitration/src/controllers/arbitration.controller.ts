import { Controller, Post, Get, Body, Param, UseGuards } from '@nestjs/common';
import { FounderApprovalService } from '../services/founder-approval.service';
import { PC365Guard } from '../../../shared/lib/src/pc365Guard';
import {
  RequestArbitrationDto,
  FounderApprovalDto,
  ArbitrationStatusDto
} from '../dto/arbitration.dto';

@Controller('marp/arbitration')
@UseGuards(PC365Guard)
export class ArbitrationController {
  constructor(private readonly founderApprovalService: FounderApprovalService) {}

  @Post('request')
  async requestArbitration(@Body() dto: RequestArbitrationDto): Promise<ArbitrationStatusDto> {
    return this.founderApprovalService.requestArbitration(dto, 'system-user'); // TODO: Get from auth context
  }

  @Post('approve')
  async approveArbitration(@Body() dto: FounderApprovalDto): Promise<ArbitrationStatusDto> {
    return this.founderApprovalService.approveArbitration(dto, 'founder-user'); // TODO: Get from auth context
  }

  @Get('status/:id')
  async getArbitrationStatus(@Param('id') arbitrationId: string): Promise<ArbitrationStatusDto> {
    return this.founderApprovalService.getArbitrationStatus(arbitrationId);
  }
}
