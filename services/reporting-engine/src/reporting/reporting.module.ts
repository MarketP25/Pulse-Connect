import { TypeOrmModule } from '@nestjs/typeorm';
import { ReportingController } from './reporting.controller';
import { ReportingService } from './reporting.service';
import { RevenueRollup } from './entities/revenue-rollup.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([RevenueRollup]),
  ],
  controllers: [ReportingController],
  providers: [ReportingService],
  exports: [ReportingService],
})
export class ReportingModule {}
=======
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReportingController } from './reporting.controller';
import { ReportingService } from './reporting.service';
import { RevenueRollup } from './entities/revenue-rollup.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([RevenueRollup]),
  ],
  controllers: [ReportingController],
  providers: [ReportingService],
  exports: [ReportingService],
})
export class ReportingModule {}
