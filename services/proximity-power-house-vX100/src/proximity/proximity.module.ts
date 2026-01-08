import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProximityController } from './proximity.controller';
import { ProximityService } from './proximity.service';
import { Geocode } from './entities/geocode.entity';
import { ProximityRule } from './entities/proximity-rule.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Geocode, ProximityRule]),
  ],
  controllers: [ProximityController],
  providers: [ProximityService],
  exports: [ProximityService],
})
export class ProximityModule {}
