import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable CORS for cross-origin requests
  app.enableCors();

  // Global prefix for all routes
  app.setGlobalPrefix('api/v1');

  // Start the server
  await app.listen(3001);
  console.log('Pulse Intelligence Core running on http://localhost:3001');
}

bootstrap();
