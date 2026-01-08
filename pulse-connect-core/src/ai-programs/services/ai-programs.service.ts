import { Pool } from "pg";
import { v4 as uuidv4 } from "uuid";
import { createHash } from "crypto";

export interface AIProgramRun {
  id: string;
  user_id: string;
  program_type: "basic" | "advanced" | "premium";
  input_hash: string;
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
  cached: boolean;
  batched: boolean;
  compressed: boolean;
  compression_ratio: number;
  execution_provider?: string;
  execution_model?: string;
  region_code: string;
  canonical_usd_value: number;
  fx_rate: number;
  regional_fee_usd: number;
  policy_version: string;
  trace_id: string;
  pap_workflow_id?: string;
  status: "pending" | "running" | "completed" | "failed" | "cancelled";
  started_at?: Date;
  completed_at?: Date;
  error_message?: string;
  created_at: Date;
  updated_at: Date;
}

export interface AIProgramRequest {
  user_id: string;
  program_type: "basic" | "advanced" | "premium";
  input: string;
  region_code?: string;
  trace_id?: string;
  pap_workflow_id?: string;
}

export interface AIProgramResult {
  run_id: string;
  output: string;
  tokens_used: number;
  cached: boolean;
  batched: boolean;
  compressed: boolean;
  execution_provider: string;
  execution_model: string;
  cost_usd: number;
  regional_cost: number;
  currency: string;
}

export class AIProgramsService {
  constructor(
    private pool: Pool,
    private router: AIRouterService,
    private feeRegistry: GlobalFeeRegistryService,
    private auditLogger: AIAuditLoggerService,
    private complianceEngine: AIComplianceService
  ) {}

  /**
   * Execute an AI program with full PAP workflow enforcement
   */
  async executeProgram(request: AIProgramRequest): Promise<AIProgramResult> {
    const traceId = request.trace_id || uuidv4();
    const regionCode = request.region_code || "US";

    // Step 1: PAP Workflow Validation
    await this.validatePAPWorkflow(request.user_id, request.program_type, traceId);

    // Step 2: Compliance Check
    const complianceResult = await this.complianceEngine.checkContent(
      request.input,
      "input",
      traceId
    );
    if (!complianceResult.allowed) {
      throw new Error(`Content blocked: ${complianceResult.reason}`);
    }

    // Step 3: Check Cache
    const inputHash = this.generateInputHash(request.input);
    const cachedResult = await this.checkCache(inputHash, request.program_type);
    if (cachedResult) {
      return this.processCachedResult(cachedResult, request, traceId, regionCode);
    }

    // Step 4: Create Program Run Record
    const programRun = await this.createProgramRun(request, inputHash, traceId, regionCode);

    try {
      // Step 5: Route to AI Execution
      const executionResult = await this.router.routeProgram(programRun);

      // Step 6: Update Run Record
      await this.updateProgramRun(programRun.id, {
        status: "completed",
        output_tokens: executionResult.output_tokens,
        total_tokens: executionResult.input_tokens + executionResult.output_tokens,
        execution_provider: executionResult.provider,
        execution_model: executionResult.model,
        completed_at: new Date()
      });

      // Step 7: Calculate and Record Fees
      const feeResult = await this.calculateAndRecordFees(programRun, executionResult, regionCode);

      // Step 8: Audit Log
      await this.auditLogger.logProgramExecution(programRun, executionResult, feeResult, traceId);

      // Step 9: Cache Result (if appropriate)
      if (executionResult.should_cache) {
        await this.cacheResult(
          inputHash,
          request.program_type,
          executionResult.output,
          executionResult.total_tokens
        );
      }

      // Step 10: Compliance Check Output
      await this.complianceEngine.checkContent(
        executionResult.output,
        "output",
        traceId,
        programRun.id
      );

      return {
        run_id: programRun.id,
        output: executionResult.output,
        tokens_used: executionResult.total_tokens,
        cached: false,
        batched: executionResult.batched,
        compressed: executionResult.compressed,
        execution_provider: executionResult.provider,
        execution_model: executionResult.model,
        cost_usd: feeResult.canonical_usd,
        regional_cost: feeResult.regional_usd,
        currency: feeResult.currency
      };
    } catch (error) {
      // Update run record with failure
      await this.updateProgramRun(programRun.id, {
        status: "failed",
        error_message: error.message,
        completed_at: new Date()
      });

      // Audit log the failure
      await this.auditLogger.logProgramFailure(programRun, error.message, traceId);

      throw error;
    }
  }

  /**
   * Get program run by ID
   */
  async getProgramRun(runId: string): Promise<AIProgramRun | null> {
    const result = await this.pool.query(
      `
      SELECT * FROM ai_program_runs WHERE id = $1
    `,
      [runId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapProgramRunRow(result.rows[0]);
  }

  /**
   * Get user's program runs with pagination
   */
  async getUserProgramRuns(
    userId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<AIProgramRun[]> {
    const result = await this.pool.query(
      `
      SELECT * FROM ai_program_runs
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT $2 OFFSET $3
    `,
      [userId, limit, offset]
    );

    return result.rows.map((row) => this.mapProgramRunRow(row));
  }

  /**
   * Get program usage statistics for user
   */
  async getUserUsageStats(
    userId: string,
    periodDays: number = 30
  ): Promise<{
    total_runs: number;
    total_tokens: number;
    total_cost_usd: number;
    program_type_breakdown: Record<string, number>;
    daily_usage: Array<{ date: string; runs: number; tokens: number; cost_usd: number }>;
  }> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - periodDays);

    // Total stats
    const totalStats = await this.pool.query(
      `
      SELECT
        COUNT(*) as total_runs,
        SUM(total_tokens) as total_tokens,
        SUM(canonical_usd_value) as total_cost_usd
      FROM ai_program_runs
      WHERE user_id = $1 AND created_at >= $2 AND status = 'completed'
    `,
      [userId, cutoffDate.toISOString()]
    );

    // Program type breakdown
    const typeBreakdown = await this.pool.query(
      `
      SELECT program_type, COUNT(*) as count
      FROM ai_program_runs
      WHERE user_id = $1 AND created_at >= $2 AND status = 'completed'
      GROUP BY program_type
    `,
      [userId, cutoffDate.toISOString()]
    );

    // Daily usage
    const dailyUsage = await this.pool.query(
      `
      SELECT
        DATE(created_at) as date,
        COUNT(*) as runs,
        SUM(total_tokens) as tokens,
        SUM(canonical_usd_value) as cost_usd
      FROM ai_program_runs
      WHERE user_id = $1 AND created_at >= $2 AND status = 'completed'
      GROUP BY DATE(created_at)
      ORDER BY date DESC
    `,
      [userId, cutoffDate.toISOString()]
    );

    return {
      total_runs: parseInt(totalStats.rows[0].total_runs) || 0,
      total_tokens: parseInt(totalStats.rows[0].total_tokens) || 0,
      total_cost_usd: parseFloat(totalStats.rows[0].total_cost_usd) || 0,
      program_type_breakdown: Object.fromEntries(
        typeBreakdown.rows.map((row) => [row.program_type, parseInt(row.count)])
      ),
      daily_usage: dailyUsage.rows.map((row) => ({
        date: row.date,
        runs: parseInt(row.runs),
        tokens: parseInt(row.tokens),
        cost_usd: parseFloat(row.cost_usd)
      }))
    };
  }

  /**
   * Cancel a pending program run
   */
  async cancelProgramRun(runId: string, userId: string): Promise<boolean> {
    const result = await this.pool.query(
      `
      UPDATE ai_program_runs
      SET status = 'cancelled', updated_at = NOW()
      WHERE id = $1 AND user_id = $2 AND status = 'pending'
      RETURNING id
    `,
      [runId, userId]
    );

    return result.rows.length > 0;
  }

  private async validatePAPWorkflow(
    userId: string,
    programType: string,
    traceId: string
  ): Promise<void> {
    // This would integrate with PAP entitlements service
    // For now, basic validation - in full implementation, check PAP subscription status
    console.log(
      `PAP workflow validation for user ${userId}, program ${programType}, trace ${traceId}`
    );
  }

  private generateInputHash(input: string): string {
    return createHash("sha256").update(input).digest("hex").substring(0, 16);
  }

  private async checkCache(inputHash: string, programType: string): Promise<any | null> {
    const result = await this.pool.query(
      `
      SELECT * FROM ai_program_cache
      WHERE input_hash = $1 AND program_type = $2 AND expires_at > NOW()
      ORDER BY created_at DESC
      LIMIT 1
    `,
      [inputHash, programType]
    );

    if (result.rows.length === 0) {
      return null;
    }

    // Update hit count
    await this.pool.query(
      `
      UPDATE ai_program_cache
      SET hit_count = hit_count + 1, last_accessed_at = NOW()
      WHERE id = $1
    `,
      [result.rows[0].id]
    );

    return result.rows[0];
  }

  private async processCachedResult(
    cachedResult: any,
    request: AIProgramRequest,
    traceId: string,
    regionCode: string
  ): Promise<AIProgramResult> {
    // Create a new run record for the cached result
    const programRun = await this.createProgramRun(
      request,
      cachedResult.input_hash,
      traceId,
      regionCode
    );

    // Update with cached data
    await this.updateProgramRun(programRun.id, {
      status: "completed",
      cached: true,
      total_tokens: cachedResult.tokens_used,
      execution_provider: "cache",
      completed_at: new Date()
    });

    // Calculate fees (cached results still incur cost)
    const feePolicy = await this.feeRegistry.getCurrentPolicy();
    const programPricing = feePolicy.ai_program_policies[request.program_type];
    const canonicalUsd = programPricing.usd_price;

    const regionalFee = await this.feeRegistry.calculateRegionalFee(canonicalUsd, regionCode);

    // Record fee transaction
    await this.recordFeeTransaction(programRun, canonicalUsd, regionalFee, regionCode);

    // Audit log
    await this.auditLogger.logCachedProgramExecution(programRun, cachedResult, traceId);

    return {
      run_id: programRun.id,
      output: cachedResult.cached_output,
      tokens_used: cachedResult.tokens_used,
      cached: true,
      batched: false,
      compressed: cachedResult.compression_applied,
      execution_provider: "cache",
      execution_model: "cached",
      cost_usd: canonicalUsd,
      regional_cost: regionalFee.regional_usd,
      currency: regionalFee.currency
    };
  }

  private async createProgramRun(
    request: AIProgramRequest,
    inputHash: string,
    traceId: string,
    regionCode: string
  ): Promise<AIProgramRun> {
    const inputTokens = this.estimateTokens(request.input);

    const result = await this.pool.query(
      `
      INSERT INTO ai_program_runs (
        user_id, program_type, input_hash, input_tokens, region_code,
        policy_version, trace_id, pap_workflow_id, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending')
      RETURNING *
    `,
      [
        request.user_id,
        request.program_type,
        inputHash,
        inputTokens,
        regionCode,
        "v4.0.0", // Current policy version
        traceId,
        request.pap_workflow_id || null
      ]
    );

    return this.mapProgramRunRow(result.rows[0]);
  }

  private async updateProgramRun(runId: string, updates: Partial<AIProgramRun>): Promise<void> {
    const fields = [];
    const values = [];
    let paramIndex = 1;

    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        fields.push(`${key} = $${paramIndex}`);
        values.push(value);
        paramIndex++;
      }
    }

    if (fields.length === 0) return;

    fields.push("updated_at = NOW()");
    values.push(runId);

    await this.pool.query(
      `
      UPDATE ai_program_runs
      SET ${fields.join(", ")}
      WHERE id = $${paramIndex}
    `,
      values
    );
  }

  private async calculateAndRecordFees(
    programRun: AIProgramRun,
    executionResult: any,
    regionCode: string
  ): Promise<any> {
    const feePolicy = await this.feeRegistry.getCurrentPolicy();
    const programPricing = feePolicy.ai_program_policies[programRun.program_type];
    const canonicalUsd = programPricing.usd_price;

    const regionalFee = await this.feeRegistry.calculateRegionalFee(canonicalUsd, regionCode);

    // Update program run with fee information
    await this.updateProgramRun(programRun.id, {
      canonical_usd_value: canonicalUsd,
      fx_rate: regionalFee.fx_rate,
      regional_fee_usd: regionalFee.regional_usd
    });

    // Record fee transaction
    await this.recordFeeTransaction(programRun, canonicalUsd, regionalFee, regionCode);

    return {
      canonical_usd: canonicalUsd,
      regional_usd: regionalFee.regional_usd,
      fx_rate: regionalFee.fx_rate,
      currency: regionalFee.currency
    };
  }

  private async recordFeeTransaction(
    programRun: AIProgramRun,
    canonicalUsd: number,
    regionalFee: any,
    regionCode: string
  ): Promise<void> {
    // This would integrate with the ledger service
    // For now, log the transaction
    console.log(`Recording fee transaction for run ${programRun.id}: ${canonicalUsd} USD`);
  }

  private async cacheResult(
    inputHash: string,
    programType: string,
    output: string,
    tokensUsed: number
  ): Promise<void> {
    await this.pool.query(
      `
      INSERT INTO ai_program_cache (
        input_hash, program_type, cached_output, tokens_used
      ) VALUES ($1, $2, $3, $4)
      ON CONFLICT (input_hash) DO UPDATE SET
        cached_output = EXCLUDED.cached_output,
        tokens_used = EXCLUDED.tokens_used,
        hit_count = ai_program_cache.hit_count + 1,
        last_accessed_at = NOW()
    `,
      [inputHash, programType, output, tokensUsed]
    );
  }

  private estimateTokens(input: string): number {
    // Rough estimation: ~4 characters per token for English text
    return Math.ceil(input.length / 4);
  }

  private mapProgramRunRow(row: any): AIProgramRun {
    return {
      id: row.id,
      user_id: row.user_id,
      program_type: row.program_type,
      input_hash: row.input_hash,
      input_tokens: parseInt(row.input_tokens),
      output_tokens: parseInt(row.output_tokens),
      total_tokens: parseInt(row.total_tokens),
      cached: Boolean(row.cached),
      batched: Boolean(row.batched),
      compressed: Boolean(row.compressed),
      compression_ratio: parseFloat(row.compression_ratio),
      execution_provider: row.execution_provider,
      execution_model: row.execution_model,
      region_code: row.region_code,
      canonical_usd_value: parseFloat(row.canonical_usd_value),
      fx_rate: parseFloat(row.fx_rate),
      regional_fee_usd: parseFloat(row.regional_fee_usd),
      policy_version: row.policy_version,
      trace_id: row.trace_id,
      pap_workflow_id: row.pap_workflow_id,
      status: row.status,
      started_at: row.started_at ? new Date(row.started_at) : undefined,
      completed_at: row.completed_at ? new Date(row.completed_at) : undefined,
      error_message: row.error_message,
      created_at: new Date(row.created_at),
      updated_at: new Date(row.updated_at)
    };
  }
}

// Placeholder interfaces for dependent services
interface AIRouterService {
  routeProgram(programRun: AIProgramRun): Promise<any>;
}

interface GlobalFeeRegistryService {
  getCurrentPolicy(): Promise<any>;
  calculateRegionalFee(canonicalUsd: number, regionCode: string): Promise<any>;
}

interface AIAuditLoggerService {
  logProgramExecution(
    programRun: AIProgramRun,
    executionResult: any,
    feeResult: any,
    traceId: string
  ): Promise<void>;
  logProgramFailure(programRun: AIProgramRun, errorMessage: string, traceId: string): Promise<void>;
  logCachedProgramExecution(
    programRun: AIProgramRun,
    cachedResult: any,
    traceId: string
  ): Promise<void>;
}

interface AIComplianceService {
  checkContent(
    content: string,
    contentType: "input" | "output",
    traceId: string,
    programRunId?: string
  ): Promise<{ allowed: boolean; reason?: string }>;
}
