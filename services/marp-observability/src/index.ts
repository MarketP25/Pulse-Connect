import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { MARPObservabilityModule } from './marp-observability.module';

async function bootstrap() {
  const app = await NestFactory.create(MARPObservabilityModule);
  
  const port = process.env.PORT || 3005;
  await app.listen(port);
  
  console.log(`MARP Observability service is running on port ${port}`);
}

bootstrap();
