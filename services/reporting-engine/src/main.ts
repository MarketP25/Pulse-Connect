import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable CORS for cross-service communication
  app.enableCors();

  // Global prefix for reporting APIs
  app.setGlobalPrefix('api/v1/reports');

  await app.listen(3004);
  console.log('Reporting Engine running on port 3004');
}
bootstrap();
