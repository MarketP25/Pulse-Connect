import { IsString, IsObject, IsOptional, IsUUID } from 'class-validator';

/**
 * DTO for routing traffic requests
 */
export class RouteTrafficDto {
  @IsString()
  sourceSubsystem: string;

  @IsString()
  destinationSubsystem: string;

  @IsString()
  action: string;

  @IsObject()
  payload: Record<string, any>;

  @IsOptional()
  @IsObject()
  context?: Record<string, any>;

  @IsOptional()
  @IsUUID()
  correlationId?: string;

  @IsOptional()
  @IsString()
  priority?: string;
}

/**
 * DTO for routing result responses
 */
export class RouteResultDto {
  @IsUUID()
  correlationId: string;

  @IsString()
  status: string; // 'routed', 'blocked', 'quarantined', 'escalated'

  @IsOptional()
  @IsObject()
  processedPayload?: Record<string, any>;

  @IsOptional()
  @IsObject()
  routingMetadata?: Record<string, any>;

  @IsOptional()
  @IsObject()
  firewallActions?: Record<string, any>;

  @IsOptional()
  @IsString()
  errorMessage?: string;

  @IsOptional()
  @IsObject()
  auditEntry?: Record<string, any>;
}

/**
 * DTO for routing rules
 */
export class RoutingRuleDto {
  @IsUUID()
  id: string;

  @IsString()
  ruleName: string;

  @IsString()
  sourcePattern: string;

  @IsString()
  destinationPattern: string;

  @IsObject()
  conditions: Record<string, any>;

  @IsObject()
  actions: Record<string, any>;

  @IsOptional()
  @IsString()
  priority?: string;

  @IsString()
  createdAt: string;

  @IsString()
  updatedAt: string;
}
