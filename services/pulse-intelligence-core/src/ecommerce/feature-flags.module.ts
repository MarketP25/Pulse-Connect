import { Module } from '@nestjs/common';
import { FeatureFlagsController } from './feature-flags.controller';

@Module({
  controllers: [FeatureFlagsController],
  providers: []
})
export class FeatureFlagsModule {}
