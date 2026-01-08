import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ChatbotController } from './chatbot.controller';
import { SecureChatbotService } from './secure-chatbot.service';
import { CognitiveComputingService } from '../cognitive-computing/cognitive-computing.service';

@Module({
  imports: [
    ClientsModule.register([
      {
        name: 'KAFKA_CLIENT',
        transport: Transport.KAFKA,
        options: {
          client: {
            clientId: 'pulse-intelligence-secure-chatbot',
            brokers: [process.env.KAFKA_URL || 'localhost:9092'],
          },
          consumer: {
            groupId: 'secure-chatbot-consumer'
          }
        }
      },
    ]),
  ],
  controllers: [ChatbotController],
  providers: [SecureChatbotService, CognitiveComputingService],
  exports: [SecureChatbotService]
})
export class ChatbotModule {}
