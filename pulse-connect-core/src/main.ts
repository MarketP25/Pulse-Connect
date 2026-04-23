import { NestFactory } from "@nestjs/core";
import { FastifyAdapter, NestFastifyApplication } from "@nestjs/platform-fastify";
import { AppModule } from "./app.module";
import { Logger } from "@nestjs/common";

async function bootstrap() {
  const logger = new Logger("PulseEdgeGateway");

  // Use Fastify for planetary-scale performance as per Runbook
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({
      logger: true,
      bodyLimit: 1048576 // 1MB limit for governance policies
    })
  );

  // Preservation of raw body is mandatory for MARP RSA signature verification
  const fastifyInstance = app.getHttpAdapter().getInstance();
  fastifyInstance.addContentTypeParser(
    "application/json",
    { parseAs: "string" },
    (req, body, done) => {
      try {
        const json = JSON.parse(body as string);
        (req as any).rawBody = body;
        done(null, json);
      } catch (err) {
        done(err, null);
      }
    }
  );

  const port = process.env.PORT || 3001;
  await app.listen(port, "0.0.0.0");
  logger.log(
    `Edge Gateway active on port ${port} - Region: ${process.env.REGION_CODE || "unknown"}`
  );
}
bootstrap();
