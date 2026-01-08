import { IsString, IsEnum, IsOptional, IsObject, IsNumber, IsUUID, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { SubsystemType } from './policy-version.dto';

export enum DecisionType {
  ALLOW = 'allow',
  BLOCK = 'block',
  QUARANTINE = 'quarantine',
}

export class ExecuteRequestDto {
  @IsUUID()
  requestId: string;

  @IsEnum(SubsystemType)
  subsystem: SubsystemType;

  @IsString()
  action: string;

  @IsString()
  @IsOptional()
  userId?: string;

  @IsString()
  @IsOptional()
  regionCode?: string;

  @IsObject()
  @IsOptional()
  context?: Record<string, any>;

  @IsString()
  marpSignature: string;

  @IsString()
  @IsOptional()
  policyVersion?: string;
}

export class ExecuteResponseDto {
  @IsUUID()
  requestId: string;

  @IsEnum(DecisionType)
  decision: DecisionType;

  @IsString()
  rationale: string;

  @IsString()
  policyVersion: string;

  @IsNumber()
  executionTime: number;

  @IsNumber()
  riskScore: number;

  @ValidateNested()
  @Type(() => TelemetryData)
  telemetry: TelemetryData;

  @ValidateNested()
  @Type(() => QuarantineData)
  @IsOptional()
  quarantine?: QuarantineData;
}

export class TelemetryData {
  @IsEnum(SubsystemType)
  subsystem: SubsystemType;

  @IsString()
  action: string;

  @IsString()
  timestamp: string;

  @IsString()
  hash: string;
}

export class QuarantineData {
  @IsString()
  reason: string;

  @IsNumber()
  duration: number;

  @IsOptional()
  escalationRequired?: boolean;
}

export class ExecutionDecision {
  @IsEnum(DecisionType)
  type: DecisionType;

  @IsString()
  rationale: string;

  @IsNumber()
  riskScore: number;

  @IsString()
  @IsOptional()
  ruleId?: string;

  @IsString()
  @IsOptional()
  quarantineReason?: string;

  @IsNumber()
  @IsOptional()
  quarantineDuration?: number;

  @IsOptional()
  escalationRequired?: boolean;
}
