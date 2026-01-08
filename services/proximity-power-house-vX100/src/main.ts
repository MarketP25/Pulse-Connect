import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable CORS for cross-service communication
  app.enableCors();

  // Global prefix for proximity APIs
  app.setGlobalPrefix('api/v1/proximity');

  await app.listen(3002);
  console.log('Proximity Power House vX.100 running on port 3002');
}
bootstrap();
