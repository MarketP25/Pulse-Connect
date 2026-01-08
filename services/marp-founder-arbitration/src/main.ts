import { NestFactory } from '@nestjs/core';
import { MARPFounderArbitrationModule } from './marp-founder-arbitration.module';

async function bootstrap() {
  const app = await NestFactory.create(MARPFounderArbitrationModule);

  // Enable CORS for cross-service communication
  app.enableCors({
    origin: ['https://admin.pulsco.com', 'https://app.pulsco.com'],
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-PC365-Token'],
  });

  // Global prefix for all routes
  app.setGlobalPrefix('api/v1');

  // Start the server
  await app.listen(3004);
  console.log('MARP Founder Arbitration service running on port 3004');
}

bootstrap();
