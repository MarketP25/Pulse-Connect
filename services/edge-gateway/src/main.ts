import { NestFactory } from '@nestjs/core';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { ValidationPipe } from '@nestjs/common';
import { EdgeGatewayModule } from './edge-gateway.module';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    EdgeGatewayModule,
    new FastifyAdapter({
      logger: true,
      trustProxy: true,
    }),
  );

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Global prefix for all routes
  app.setGlobalPrefix('edge');

  // Enable CORS for planetary access
  app.enableCors({
    origin: process.env.CORS_ORIGINS?.split(',') || ['*'],
    credentials: true,
  });

  // Health check endpoint
  app.getHttpAdapter().get('/health', (req, reply) => {
    reply.send({ status: 'ok', service: 'edge-gateway', timestamp: new Date().toISOString() });
  });

  const port = process.env.PORT || 3001;
  await app.listen(port, '0.0.0.0');

  console.log(`🚀 Edge Gateway running on: http://localhost:${port}/edge`);
  console.log(`🔒 MARP Governance: ACTIVE`);
  console.log(`🌍 Planetary Scale: ENABLED`);
  console.log(`⚡ Local Resilience: READY`);
}

bootstrap();
