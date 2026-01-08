import { IsString, IsObject, IsOptional, IsBoolean, IsUUID, IsEnum, IsNumber } from 'class-validator';

export enum ArbitrationStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  ESCALATED = 'escalated',
  EXPIRED = 'expired'
}

export enum ArbitrationType {
  FOUNDER_OVERRIDE = 'founder_override',
  HIGH_RISK_OPERATION = 'high_risk_operation',
  COMPLIANCE_VIOLATION = 'compliance_violation',
  SECURITY_INCIDENT = 'security_incident'
}

/**
 * DTO for requesting founder arbitration
 */
export class RequestArbitrationDto {
  @IsEnum(ArbitrationType)
  arbitrationType: ArbitrationType;

  @IsString()
  requestReason: string;

  @IsObject()
  requestData: Record<string, any>;

  @IsOptional()
  @IsString()
  subsystemName?: string;

  @IsOptional()
  @IsObject()
  pc365Attestation?: Record<string, any>;

  @IsOptional()
  @IsString()
  deviceFingerprint?: string;

  @IsOptional()
  @IsNumber()
  approvalTimeoutMinutes?: number;
}

/**
 * DTO for founder approval decision
 */
export class FounderApprovalDto {
  @IsUUID()
  arbitrationId: string;

  @IsBoolean()
  approved: boolean;

  @IsOptional()
  @IsString()
  approvalNotes?: string;

  @IsOptional()
  @IsObject()
  approvalMetadata?: Record<string, any>;

  @IsOptional()
  @IsString()
  deviceFingerprint?: string;
}

/**
 * DTO for arbitration status response
 */
export class ArbitrationStatusDto {
  @IsUUID()
  id: string;

  @IsEnum(ArbitrationStatus)
  status: ArbitrationStatus;

  @IsEnum(ArbitrationType)
  arbitrationType: ArbitrationType;

  @IsString()
  requestReason: string;

  @IsObject()
  requestData: Record<string, any>;

  @IsOptional()
  @IsString()
  subsystemName?: string;

  @IsString()
  requestedBy: string;

  @IsString()
  requestedAt: string;

  @IsOptional()
  @IsString()
  approvedBy?: string;

  @IsOptional()
  @IsString()
  approvedAt?: string;

  @IsOptional()
  @IsString()
  approvalNotes?: string;

  @IsOptional()
  @IsString()
  expiresAt?: string;

  @IsOptional()
  @IsObject()
  auditTrail?: Record<string, any>;
}

/**
 * DTO for automated arbitration rules
 */
export class AutomatedArbitrationRuleDto {
  @IsString()
  ruleName: string;

  @IsEnum(ArbitrationType)
  arbitrationType: ArbitrationType;

  @IsObject()
  conditions: Record<string, any>;

  @IsObject()
  actions: Record<string, any>;

  @IsOptional()
  @IsNumber()
  priority?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

/**
 * DTO for device fingerprint validation
 */
export class DeviceFingerprintDto {
  @IsString()
  deviceId: string;

  @IsString()
  fingerprint: string;

  @IsString()
  userAgent: string;

  @IsString()
  ipAddress: string;

  @IsOptional()
  @IsObject()
  location?: Record<string, any>;

  @IsOptional()
  @IsString()
  lastVerifiedAt?: string;

  @IsOptional()
  @IsBoolean()
  isTrusted?: boolean;
}
