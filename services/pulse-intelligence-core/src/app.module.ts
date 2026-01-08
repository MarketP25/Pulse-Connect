import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { PoliciesModule } from './policies/policies.module';
import { DecisionsModule } from './decisions/decisions.module';
import { AccountsModule } from './accounts/accounts.module';
import { KycModule } from './ecommerce/kyc.module';
import { FeatureFlagsModule } from './ecommerce/feature-flags.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot(),
    ClientsModule.register([
      {
        name: 'KAFKA_CLIENT',
        transport: Transport.KAFKA,
        options: {
          client: {
            clientId: 'pulsco-kafka',
            brokers: [process.env.KAFKA_BROKER || 'localhost:9092']
          },
          consumer: {
            groupId: 'pulsco-consumer'
          }
        }
      }
    ]),
    PoliciesModule,
    DecisionsModule,
    AccountsModule,
    KycModule,
    FeatureFlagsModule
  ],
  controllers: [],
  providers: []
})
export class AppModule {}

