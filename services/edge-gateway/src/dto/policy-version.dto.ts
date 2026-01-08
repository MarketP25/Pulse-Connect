import { IsString, IsOptional, IsEnum } from 'class-validator';

export enum SubsystemType {
  ECOMMERCE = 'ecommerce',
  PAYMENTS = 'payments',
  FRAUD = 'fraud',
  MATCHMAKING = 'matchmaking',
  AI_PROGRAMS = 'ai-programs',
  AI_ENGINE_CHATBOT = 'ai-engine-chatbot',
  PROXIMITY_GEOCODING = 'proximity-geocoding',
  COMMUNICATION = 'communication',
  AUTOMATED_MARKETING = 'automated-marketing',
  PLACES_VENUES = 'places-venues',
}

export class PolicyVersionDto {
  @IsEnum(SubsystemType)
  @IsOptional()
  subsystem?: SubsystemType;

  @IsString()
  @IsOptional()
  regionCode?: string;
}
