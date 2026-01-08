import { Controller, Post, Body, Get, Query } from '@nestjs/common';
import { ProximityService } from './proximity.service';

@Controller()
export class ProximityController {
  constructor(private readonly proximityService: ProximityService) {}

  @Post('geocode')
  async geocode(@Body() body: { address: string }) {
    return this.proximityService.geocode(body.address);
  }

  @Post('distance')
  async calculateDistance(@Body() body: { lat1: number; lng1: number; lat2: number; lng2: number }) {
    return this.proximityService.calculateDistance(body.lat1, body.lng1, body.lat2, body.lng2);
  }

  @Post('cluster')
  async cluster(@Body() body: { points: Array<{ lat: number; lng: number }>; k: number }) {
    return this.proximityService.cluster(body.points, body.k);
  }

  @Get('rules')
  async getRules() {
    return this.proximityService.getRules();
  }

  @Post('rules')
  async createRule(@Body() body: any) {
    return this.proximityService.createRule(body);
  }
}
