import { Module } from '@nestjs/common';
import { KycController } from './kyc.controller';
import { AiEngineService } from '../ai-engine/ai-engine.service';

@Module({
  controllers: [KycController],
  providers: [AiEngineService]
})
export class KycModule {}
