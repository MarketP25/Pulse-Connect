import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import { FounderCommsModule } from "./founder-comms/founder-comms.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ".env"
    }),
    TypeOrmModule.forRoot({
      type: "postgres",
      host: process.env.POSTGRES_HOST || "localhost",
      port: parseInt(process.env.POSTGRES_PORT || "5432"),
      username: process.env.POSTGRES_USER || "postgres",
      password: process.env.POSTGRES_PASSWORD || "password",
      database: process.env.POSTGRES_DB || "pulsco_central",
      entities: [__dirname + "/**/*.entity{.ts,.js}"],
      synchronize: false, // Use migrations in production
      logging: process.env.NODE_ENV === "development"
    }),
    FounderCommsModule
  ]
})
export class AppModule {}
