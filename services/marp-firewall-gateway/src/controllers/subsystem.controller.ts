import { Controller, Post, Get, Body, Param } from '@nestjs/common';
import { SubsystemService, SubsystemRegistration } from '../services/subsystem.service';

@Controller('marp/subsystems')
export class SubsystemController {
  constructor(private readonly subsystemService: SubsystemService) {}

  @Post('register')
  async registerSubsystem(@Body() registration: SubsystemRegistration) {
    return this.subsystemService.registerSubsystem(registration);
  }

  @Get(':subsystemName/status')
  async getSubsystemStatus(@Param('subsystemName') subsystemName: string) {
    return this.subsystemService.getSubsystemStatus(subsystemName);
  }

  @Post('route')
  async routeSubsystemTraffic(@Body() request: {
    subsystemName: string;
    action: string;
    payload: Record<string, any>;
  }) {
    return this.subsystemService.routeSubsystemTraffic(request);
  }
}
