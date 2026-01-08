import { IsString, IsObject, IsOptional, IsUUID, IsBoolean } from 'class-validator';

/**
 * DTO for Policy Validation Request
 */
export class ValidatePolicyDto {
  @IsString()
  policyName: string;

  @IsString()
  policyVersion: string;

  @IsObject()
  policyContent: Record<string, any>;

  @IsOptional()
  @IsString()
  subsystemScope?: string;

  @IsOptional()
  @IsObject()
  complianceRefs?: Record<string, any>;
}

/**
 * DTO for Policy Signing Request
 */
export class SignPolicyDto {
  @IsUUID()
  policyId: string;

  @IsString()
  councilDecisionId: string;

  @IsOptional()
  @IsObject()
  pc365Attestation?: Record<string, any>;

  @IsOptional()
  @IsBoolean()
  founderOverride?: boolean;
}

/**
 * DTO for Active Policies Response
 */
export class ActivePolicyDto {
  @IsUUID()
  id: string;

  @IsString()
  policyName: string;

  @IsString()
  policyVersion: string;

  @IsString()
  policyType: string;

  @IsObject()
  policyContent: Record<string, any>;

  @IsOptional()
  @IsString()
  subsystemScope?: string;

  @IsObject()
  complianceRefs: Record<string, any>;

  @IsString()
  effectiveFrom: string;

  @IsOptional()
  @IsString()
  effectiveUntil?: string;

  @IsString()
  signedBy: string;

  @IsString()
  signature: string;
}

/**
 * DTO for Policy Validation Response
 */
export class PolicyValidationResultDto {
  @IsBoolean()
  isValid: boolean;

  @IsOptional()
  @IsObject()
  validationErrors?: Record<string, any>;

  @IsOptional()
  @IsObject()
  complianceCheck?: Record<string, any>;

  @IsOptional()
  @IsString()
  riskAssessment?: string;
}

/**
 * DTO for Policy Signing Response
 */
export class PolicySigningResultDto {
  @IsBoolean()
  success: boolean;

  @IsOptional()
  @IsUUID()
  signedPolicyId?: string;

  @IsOptional()
  @IsString()
  signature?: string;

  @IsOptional()
  @IsObject()
  auditEntry?: Record<string, any>;
}
