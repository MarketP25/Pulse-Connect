import { IsString, IsObject, IsOptional, IsNumber, IsBoolean, IsEnum, IsUUID } from 'class-validator';

/**
 * Enum for firewall rule types
 */
export enum FirewallRuleType {
  ALLOW = 'allow',
  BLOCK = 'block',
  QUARANTINE = 'quarantine',
  ESCALATE = 'escalate',
}

/**
 * Enum for firewall directions
 */
export enum FirewallDirection {
  INBOUND = 'inbound',
  OUTBOUND = 'outbound',
}

/**
 * DTO for creating firewall rules
 */
export class CreateFirewallRuleDto {
  @IsString()
  ruleName: string;

  @IsEnum(FirewallRuleType)
  ruleType: FirewallRuleType;

  @IsEnum(FirewallDirection)
  direction: FirewallDirection;

  @IsOptional()
  @IsString()
  subsystemScope?: string;

  @IsOptional()
  @IsString()
  sourcePattern?: string;

  @IsOptional()
  @IsString()
  destinationPattern?: string;

  @IsOptional()
  @IsObject()
  conditions?: Record<string, any>;

  @IsOptional()
  @IsObject()
  actions?: Record<string, any>;

  @IsOptional()
  @IsNumber()
  priority?: number;

  @IsOptional()
  @IsUUID()
  councilDecisionId?: string;
}

/**
 * DTO for firewall enforcement request
 */
export class FirewallEnforceDto {
  @IsString()
  subsystemName: string;

  @IsString()
  action: string;

  @IsObject()
  payload: Record<string, any>;

  @IsOptional()
  @IsObject()
  context?: Record<string, any>;
}

/**
 * DTO for firewall rule response
 */
export class FirewallRuleDto {
  @IsUUID()
  id: string;

  @IsString()
  ruleName: string;

  @IsEnum(FirewallRuleType)
  ruleType: FirewallRuleType;

  @IsEnum(FirewallDirection)
  direction: FirewallDirection;

  @IsOptional()
  @IsString()
  subsystemScope?: string;

  @IsOptional()
  @IsString()
  sourcePattern?: string;

  @IsOptional()
  @IsString()
  destinationPattern?: string;

  @IsOptional()
  @IsObject()
  conditions?: Record<string, any>;

  @IsOptional()
  @IsObject()
  actions?: Record<string, any>;

  @IsNumber()
  priority: number;

  @IsBoolean()
  isActive: boolean;

  @IsOptional()
  @IsUUID()
  councilDecisionId?: string;

  @IsString()
  createdBy: string;

  @IsString()
  effectiveFrom: string;

  @IsOptional()
  @IsString()
  effectiveUntil?: string;

  @IsString()
  createdAt: string;

  @IsString()
  updatedAt: string;
}

/**
 * DTO for firewall enforcement result
 */
export class FirewallEnforceResultDto {
  @IsBoolean()
  allowed: boolean;

  @IsOptional()
  @IsString()
  action?: string;

  @IsOptional()
  @IsObject()
  appliedRules?: FirewallRuleDto[];

  @IsOptional()
  @IsObject()
  quarantineInfo?: Record<string, any>;

  @IsOptional()
  @IsObject()
  escalationInfo?: Record<string, any>;

  @IsOptional()
  @IsString()
  riskAssessment?: string;

  @IsOptional()
  @IsObject()
  auditEntry?: Record<string, any>;
}
