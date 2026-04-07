import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpStatus,
  HttpException,
  UseGuards,
  Logger
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from "@nestjs/swagger";
import { EventBusService, PolicyEvent } from "../events/event-bus.service";
import { PoliciesService } from "./policies.service";
import { PolicyGuard } from "../guards/policy.guard";
import { AuditService } from "../services/audit.service";

export interface Policy {
  id: string;
  name: string;
  description: string;
  version: string;
  scope: string[];
  rules: PolicyRule[];
  status: "draft" | "active" | "inactive" | "deprecated";
  effectiveFrom: Date;
  effectiveTo?: Date;
  createdBy: string;
  updatedBy: string;
  createdAt: Date;
  updatedAt: Date;
  metadata: {
    priority: number;
    category: string;
    tags: string[];
    compliance: string[];
    riskLevel: "low" | "medium" | "high" | "critical";
  };
}

export interface PolicyRule {
  id: string;
  name: string;
  description: string;
  condition: PolicyCondition;
  action: PolicyAction;
  priority: number;
  enabled: boolean;
}

export interface PolicyCondition {
  type: "user" | "context" | "time" | "location" | "transaction" | "custom";
  operator:
    | "equals"
    | "not_equals"
    | "contains"
    | "not_contains"
    | "greater_than"
    | "less_than"
    | "between"
    | "in"
    | "not_in";
  field: string;
  value: any;
  additionalConditions?: PolicyCondition[];
  logicalOperator?: "AND" | "OR";
}

export interface PolicyAction {
  type: "allow" | "deny" | "modify" | "notify" | "escalate" | "log";
  parameters: Record<string, any>;
  severity: "info" | "warning" | "error" | "critical";
}

export interface CreatePolicyDto {
  name: string;
  description: string;
  scope: string[];
  rules: PolicyRule[];
  effectiveFrom: Date;
  effectiveTo?: Date;
  metadata: Policy["metadata"];
}

export interface UpdatePolicyDto {
  name?: string;
  description?: string;
  scope?: string[];
  rules?: PolicyRule[];
  effectiveTo?: Date;
  metadata?: Partial<Policy["metadata"]>;
}

export interface PolicyQueryDto {
  scope?: string;
  status?: string;
  category?: string;
  tags?: string[];
  riskLevel?: string;
  limit?: number;
  offset?: number;
}

@ApiTags("Policies")
@Controller("policies")
@UseGuards(PolicyGuard)
export class PoliciesController {
  private readonly logger = new Logger(PoliciesController.name);

  constructor(
    private readonly policiesService: PoliciesService,
    private readonly eventBus: EventBusService,
    private readonly auditService: AuditService
  ) {}

  @Get()
  @ApiOperation({ summary: "Get all policies with filtering" })
  @ApiQuery({ name: "scope", required: false, description: "Filter by policy scope" })
  @ApiQuery({ name: "status", required: false, description: "Filter by policy status" })
  @ApiQuery({ name: "category", required: false, description: "Filter by policy category" })
  @ApiQuery({ name: "tags", required: false, description: "Filter by policy tags" })
  @ApiQuery({ name: "riskLevel", required: false, description: "Filter by risk level" })
  @ApiQuery({ name: "limit", required: false, description: "Limit results" })
  @ApiQuery({ name: "offset", required: false, description: "Offset for pagination" })
  @ApiResponse({ status: 200, description: "Policies retrieved successfully" })
  async getPolicies(@Query() query: PolicyQueryDto) {
    try {
      const policies = await this.policiesService.getPolicies(query);
      return {
        success: true,
        data: policies,
        metadata: {
          total: policies.length,
          query
        }
      };
    } catch (error) {
      this.logger.error(`Failed to get policies: ${error.message}`);
      throw new HttpException("Failed to retrieve policies", HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get("active")
  @ApiOperation({ summary: "Get all active policies" })
  @ApiResponse({ status: 200, description: "Active policies retrieved successfully" })
  async getActivePolicies() {
    try {
      const policies = await this.policiesService.getActivePolicies();
      return {
        success: true,
        data: policies
      };
    } catch (error) {
      this.logger.error(`Failed to get active policies: ${error.message}`);
      throw new HttpException(
        "Failed to retrieve active policies",
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get(":id")
  @ApiOperation({ summary: "Get policy by ID" })
  @ApiParam({ name: "id", description: "Policy ID" })
  @ApiResponse({ status: 200, description: "Policy retrieved successfully" })
  @ApiResponse({ status: 404, description: "Policy not found" })
  async getPolicy(@Param("id") id: string) {
    try {
      const policy = await this.policiesService.getPolicyById(id);
      if (!policy) {
        throw new HttpException("Policy not found", HttpStatus.NOT_FOUND);
      }
      return {
        success: true,
        data: policy
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error(`Failed to get policy ${id}: ${error.message}`);
      throw new HttpException("Failed to retrieve policy", HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Post()
  @ApiOperation({ summary: "Create a new policy" })
  @ApiResponse({ status: 201, description: "Policy created successfully" })
  @ApiResponse({ status: 400, description: "Invalid policy data" })
  async createPolicy(@Body() createPolicyDto: CreatePolicyDto) {
    try {
      // Validate policy data
      await this.validatePolicyData(createPolicyDto);

      const policy = await this.policiesService.createPolicy(createPolicyDto);

      // Publish policy event
      await this.eventBus.publishPolicy({
        policyId: policy.id,
        version: policy.version,
        scope: policy.scope,
        rules: policy.rules,
        effectiveFrom: policy.effectiveFrom.toISOString(),
        effectiveTo: policy.effectiveTo?.toISOString()
      });

      // Audit the creation
      await this.auditService.logEvent({
        action: "policy_created",
        resource: "policy",
        resourceId: policy.id,
        details: { policyName: policy.name, scope: policy.scope }
      });

      return {
        success: true,
        data: policy,
        message: "Policy created successfully"
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error(`Failed to create policy: ${error.message}`);
      throw new HttpException("Failed to create policy", HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Put(":id")
  @ApiOperation({ summary: "Update an existing policy" })
  @ApiParam({ name: "id", description: "Policy ID" })
  @ApiResponse({ status: 200, description: "Policy updated successfully" })
  @ApiResponse({ status: 404, description: "Policy not found" })
  async updatePolicy(@Param("id") id: string, @Body() updatePolicyDto: UpdatePolicyDto) {
    try {
      const existingPolicy = await this.policiesService.getPolicyById(id);
      if (!existingPolicy) {
        throw new HttpException("Policy not found", HttpStatus.NOT_FOUND);
      }

      // Check if policy is active and being modified
      if (existingPolicy.status === "active") {
        await this.handleActivePolicyUpdate(existingPolicy, updatePolicyDto);
      }

      const updatedPolicy = await this.policiesService.updatePolicy(id, updatePolicyDto);

      // Publish policy update event
      await this.eventBus.publishPolicy({
        policyId: updatedPolicy.id,
        version: updatedPolicy.version,
        scope: updatedPolicy.scope,
        rules: updatedPolicy.rules,
        effectiveFrom: updatedPolicy.effectiveFrom.toISOString(),
        effectiveTo: updatedPolicy.effectiveTo?.toISOString()
      });

      // Audit the update
      await this.auditService.logEvent({
        action: "policy_updated",
        resource: "policy",
        resourceId: id,
        details: { changes: updatePolicyDto }
      });

      return {
        success: true,
        data: updatedPolicy,
        message: "Policy updated successfully"
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error(`Failed to update policy ${id}: ${error.message}`);
      throw new HttpException("Failed to update policy", HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Put(":id/activate")
  @ApiOperation({ summary: "Activate a policy" })
  @ApiParam({ name: "id", description: "Policy ID" })
  @ApiResponse({ status: 200, description: "Policy activated successfully" })
  @ApiResponse({ status: 404, description: "Policy not found" })
  async activatePolicy(@Param("id") id: string) {
    try {
      const policy = await this.policiesService.getPolicyById(id);
      if (!policy) {
        throw new HttpException("Policy not found", HttpStatus.NOT_FOUND);
      }

      if (policy.status === "active") {
        throw new HttpException("Policy is already active", HttpStatus.BAD_REQUEST);
      }

      // Validate policy can be activated
      await this.validatePolicyActivation(policy);

      const activatedPolicy = await this.policiesService.activatePolicy(id);

      // Publish policy activation event
      await this.eventBus.publishPolicy({
        policyId: activatedPolicy.id,
        version: activatedPolicy.version,
        scope: activatedPolicy.scope,
        rules: activatedPolicy.rules,
        effectiveFrom: activatedPolicy.effectiveFrom.toISOString(),
        effectiveTo: activatedPolicy.effectiveTo?.toISOString()
      });

      // Audit the activation
      await this.auditService.logEvent({
        action: "policy_activated",
        resource: "policy",
        resourceId: id,
        details: { policyName: policy.name }
      });

      return {
        success: true,
        data: activatedPolicy,
        message: "Policy activated successfully"
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error(`Failed to activate policy ${id}: ${error.message}`);
      throw new HttpException("Failed to activate policy", HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Put(":id/deactivate")
  @ApiOperation({ summary: "Deactivate a policy" })
  @ApiParam({ name: "id", description: "Policy ID" })
  @ApiResponse({ status: 200, description: "Policy deactivated successfully" })
  @ApiResponse({ status: 404, description: "Policy not found" })
  async deactivatePolicy(@Param("id") id: string) {
    try {
      const policy = await this.policiesService.getPolicyById(id);
      if (!policy) {
        throw new HttpException("Policy not found", HttpStatus.NOT_FOUND);
      }

      if (policy.status !== "active") {
        throw new HttpException("Policy is not active", HttpStatus.BAD_REQUEST);
      }

      const deactivatedPolicy = await this.policiesService.deactivatePolicy(id);

      // Publish policy deactivation event
      const deactivationEvent: PolicyEvent = {
        eventId: this.eventBus["generateEventId"](),
        eventType: "policy.deactivated",
        source: "policies-controller",
        payload: {
          policyId: deactivatedPolicy.id,
          version: deactivatedPolicy.version,
          scope: deactivatedPolicy.scope,
          rules: deactivatedPolicy.rules,
          effectiveFrom: deactivatedPolicy.effectiveFrom.toISOString(),
          effectiveTo: new Date().toISOString()
        },
        metadata: {
          timestamp: new Date().toISOString(),
          policyId: deactivatedPolicy.id
        }
      };

      await this.eventBus.publish(deactivationEvent);

      // Audit the deactivation
      await this.auditService.logEvent({
        action: "policy_deactivated",
        resource: "policy",
        resourceId: id,
        details: { policyName: policy.name }
      });

      return {
        success: true,
        data: deactivatedPolicy,
        message: "Policy deactivated successfully"
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error(`Failed to deactivate policy ${id}: ${error.message}`);
      throw new HttpException("Failed to deactivate policy", HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Delete(":id")
  @ApiOperation({ summary: "Delete a policy" })
  @ApiParam({ name: "id", description: "Policy ID" })
  @ApiResponse({ status: 200, description: "Policy deleted successfully" })
  @ApiResponse({ status: 404, description: "Policy not found" })
  async deletePolicy(@Param("id") id: string) {
    try {
      const policy = await this.policiesService.getPolicyById(id);
      if (!policy) {
        throw new HttpException("Policy not found", HttpStatus.NOT_FOUND);
      }

      // Prevent deletion of active policies
      if (policy.status === "active") {
        throw new HttpException(
          "Cannot delete an active policy. Deactivate first.",
          HttpStatus.BAD_REQUEST
        );
      }

      await this.policiesService.deletePolicy(id);

      // Audit the deletion
      await this.auditService.logEvent({
        action: "policy_deleted",
        resource: "policy",
        resourceId: id,
        details: { policyName: policy.name }
      });

      return {
        success: true,
        message: "Policy deleted successfully"
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error(`Failed to delete policy ${id}: ${error.message}`);
      throw new HttpException("Failed to delete policy", HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Post(":id/validate")
  @ApiOperation({ summary: "Validate a policy against test data" })
  @ApiParam({ name: "id", description: "Policy ID" })
  @ApiResponse({ status: 200, description: "Policy validation completed" })
  async validatePolicy(@Param("id") id: string, @Body() testData: any) {
    try {
      const policy = await this.policiesService.getPolicyById(id);
      if (!policy) {
        throw new HttpException("Policy not found", HttpStatus.NOT_FOUND);
      }

      const validationResult = await this.policiesService.validatePolicy(policy, testData);

      return {
        success: true,
        data: validationResult
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error(`Failed to validate policy ${id}: ${error.message}`);
      throw new HttpException("Failed to validate policy", HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get(":id/history")
  @ApiOperation({ summary: "Get policy change history" })
  @ApiParam({ name: "id", description: "Policy ID" })
  @ApiResponse({ status: 200, description: "Policy history retrieved successfully" })
  async getPolicyHistory(@Param("id") id: string) {
    try {
      const history = await this.policiesService.getPolicyHistory(id);
      return {
        success: true,
        data: history
      };
    } catch (error) {
      this.logger.error(`Failed to get policy history ${id}: ${error.message}`);
      throw new HttpException(
        "Failed to retrieve policy history",
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Validate policy data before creation
   */
  private async validatePolicyData(policyData: CreatePolicyDto): Promise<void> {
    if (!policyData.name || policyData.name.trim().length === 0) {
      throw new HttpException("Policy name is required", HttpStatus.BAD_REQUEST);
    }

    if (!policyData.scope || policyData.scope.length === 0) {
      throw new HttpException("Policy scope is required", HttpStatus.BAD_REQUEST);
    }

    if (!policyData.rules || policyData.rules.length === 0) {
      throw new HttpException("Policy must have at least one rule", HttpStatus.BAD_REQUEST);
    }

    // Validate rules
    for (const rule of policyData.rules) {
      if (!rule.condition || !rule.action) {
        throw new HttpException(
          "Each rule must have a condition and action",
          HttpStatus.BAD_REQUEST
        );
      }
    }

    // Check for duplicate policy names in same scope
    const existingPolicy = await this.policiesService.findByNameAndScope(
      policyData.name,
      policyData.scope
    );
    if (existingPolicy) {
      throw new HttpException(
        "Policy with this name already exists in the specified scope",
        HttpStatus.BAD_REQUEST
      );
    }
  }

  /**
   * Handle updates to active policies
   */
  private async handleActivePolicyUpdate(
    existingPolicy: Policy,
    updates: UpdatePolicyDto
  ): Promise<void> {
    // Create a new version for active policy updates
    const newVersion = this.incrementVersion(existingPolicy.version);

    // Archive current version
    await this.policiesService.archivePolicyVersion(existingPolicy.id, existingPolicy.version);

    // Update with new version
    updates.version = newVersion;
  }

  /**
   * Validate policy can be activated
   */
  private async validatePolicyActivation(policy: Policy): Promise<void> {
    // Check for conflicting active policies
    const conflicts = await this.policiesService.checkPolicyConflicts(policy);
    if (conflicts.length > 0) {
      throw new HttpException(
        `Policy conflicts with active policies: ${conflicts.map((c) => c.name).join(", ")}`,
        HttpStatus.BAD_REQUEST
      );
    }

    // Validate effective dates
    const now = new Date();
    if (policy.effectiveFrom > now) {
      throw new HttpException(
        "Cannot activate policy with future effective date",
        HttpStatus.BAD_REQUEST
      );
    }

    if (policy.effectiveTo && policy.effectiveTo <= now) {
      throw new HttpException(
        "Cannot activate policy with expired effective date",
        HttpStatus.BAD_REQUEST
      );
    }
  }

  /**
   * Increment policy version
   */
  private incrementVersion(version: string): string {
    const parts = version.split(".");
    const patch = parseInt(parts[parts.length - 1]) + 1;
    parts[parts.length - 1] = patch.toString();
    return parts.join(".");
  }
}
