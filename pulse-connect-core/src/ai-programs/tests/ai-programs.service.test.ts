import { AIProgramsService } from "../services/ai-programs.service";
import { Pool } from "pg";

// Mock dependencies
jest.mock("pg", () => ({
  Pool: jest.fn().mockImplementation(() => ({
    connect: jest.fn(),
    query: jest.fn()
  }))
}));

jest.mock("../services/ai-router.service");
jest.mock("../services/global-fee-registry.service");
jest.mock("../services/ai-audit-logger.service");
jest.mock("../services/ai-compliance.service");

describe("AIProgramsService", () => {
  let service: AIProgramsService;
  let mockPool: jest.Mocked<Pool>;

  beforeEach(() => {
    mockPool = new Pool() as jest.Mocked<Pool>;
    service = new AIProgramsService(
      mockPool,
      {} as any, // AIRouterService
      {} as any, // GlobalFeeRegistryService
      {} as any, // AIAuditLoggerService
      {} as any // AIComplianceService
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("executeProgram", () => {
    it("should execute basic AI program successfully", async () => {
      const request = {
        user_id: "user123",
        program_type: "basic" as const,
        input: "Test input for AI program",
        trace_id: "trace123"
      };

      // Mock PAP workflow validation
      const mockValidatePAP = jest.spyOn(service as any, "validatePAPWorkflow");
      mockValidatePAP.mockResolvedValue(undefined);

      // Mock cache check - no cached result
      const mockCheckCache = jest.spyOn(service as any, "checkCache");
      mockCheckCache.mockResolvedValue(null);

      // Mock program run creation
      const mockCreateRun = jest.spyOn(service as any, "createProgramRun");
      mockCreateRun.mockResolvedValue({
        id: "run123",
        user_id: request.user_id,
        program_type: request.program_type,
        trace_id: request.trace_id
      });

      // Mock router execution
      const mockRouter = service["router"] as jest.Mocked<any>;
      mockRouter.routeProgram.mockResolvedValue({
        output: "AI generated response",
        input_tokens: 10,
        output_tokens: 20,
        provider: "internal",
        model: "gpt-4",
        batched: false,
        compressed: false,
        total_tokens: 30,
        should_cache: true
      });

      // Mock fee calculation
      const mockCalculateFees = jest.spyOn(service as any, "calculateAndRecordFees");
      mockCalculateFees.mockResolvedValue({
        canonical_usd: 2.0,
        regional_usd: 2.0,
        fx_rate: 1.0,
        currency: "USD"
      });

      // Mock update program run
      const mockUpdateRun = jest.spyOn(service as any, "updateProgramRun");
      mockUpdateRun.mockResolvedValue(undefined);

      // Mock compliance check
      const mockCompliance = service["complianceEngine"] as jest.Mocked<any>;
      mockCompliance.checkContent.mockResolvedValue({ allowed: true });

      const result = await service.executeProgram(request);

      expect(result.run_id).toBe("run123");
      expect(result.output).toBe("AI generated response");
      expect(result.tokens_used).toBe(30);
      expect(result.cached).toBe(false);
      expect(result.cost_usd).toBe(2.0);
      expect(result.currency).toBe("USD");

      expect(mockValidatePAP).toHaveBeenCalledWith(
        request.user_id,
        request.program_type,
        request.trace_id
      );
      expect(mockCheckCache).toHaveBeenCalled();
      expect(mockCreateRun).toHaveBeenCalled();
      expect(mockRouter.routeProgram).toHaveBeenCalled();
      expect(mockCalculateFees).toHaveBeenCalled();
      expect(mockCompliance.checkContent).toHaveBeenCalledTimes(2); // input and output
    });

    it("should return cached result when available", async () => {
      const request = {
        user_id: "user123",
        program_type: "basic" as const,
        input: "Cached input",
        trace_id: "trace123"
      };

      const cachedResult = {
        input_hash: "hash123",
        cached_output: "Cached AI response",
        tokens_used: 15,
        compression_applied: false
      };

      // Mock PAP validation
      const mockValidatePAP = jest.spyOn(service as any, "validatePAPWorkflow");
      mockValidatePAP.mockResolvedValue(undefined);

      // Mock cache hit
      const mockCheckCache = jest.spyOn(service as any, "checkCache");
      mockCheckCache.mockResolvedValue(cachedResult);

      // Mock cached result processing
      const mockProcessCached = jest.spyOn(service as any, "processCachedResult");
      mockProcessCached.mockResolvedValue({
        run_id: "run123",
        output: cachedResult.cached_output,
        tokens_used: cachedResult.tokens_used,
        cached: true,
        batched: false,
        compressed: false,
        execution_provider: "cache",
        execution_model: "cached",
        cost_usd: 2.0,
        regional_cost: 2.0,
        currency: "USD"
      });

      const result = await service.executeProgram(request);

      expect(result.cached).toBe(true);
      expect(result.output).toBe("Cached AI response");
      expect(mockProcessCached).toHaveBeenCalledWith(cachedResult, request, "trace123", "US");
    });

    it("should throw error when PAP workflow validation fails", async () => {
      const request = {
        user_id: "user123",
        program_type: "basic" as const,
        input: "Test input",
        trace_id: "trace123"
      };

      const mockValidatePAP = jest.spyOn(service as any, "validatePAPWorkflow");
      mockValidatePAP.mockRejectedValue(new Error("PAP subscription not active"));

      await expect(service.executeProgram(request)).rejects.toThrow("PAP subscription not active");
    });

    it("should throw error when content is blocked by compliance", async () => {
      const request = {
        user_id: "user123",
        program_type: "basic" as const,
        input: "Blocked content",
        trace_id: "trace123"
      };

      // Mock PAP validation
      const mockValidatePAP = jest.spyOn(service as any, "validatePAPWorkflow");
      mockValidatePAP.mockResolvedValue(undefined);

      // Mock compliance block
      const mockCompliance = service["complianceEngine"] as jest.Mocked<any>;
      mockCompliance.checkContent.mockResolvedValue({
        allowed: false,
        reason: "Content blocked: violence detected"
      });

      await expect(service.executeProgram(request)).rejects.toThrow(
        "Content blocked: violence detected"
      );
    });
  });

  describe("getProgramRun", () => {
    it("should return program run when found", async () => {
      const mockRun = {
        id: "run123",
        user_id: "user123",
        program_type: "basic",
        status: "completed",
        trace_id: "trace123"
      };

      mockPool.query.mockResolvedValue({
        rows: [mockRun],
        rowCount: 1
      } as any);

      const result = await service.getProgramRun("run123");

      expect(result).toEqual(mockRun);
      expect(mockPool.query).toHaveBeenCalledWith("SELECT * FROM ai_program_runs WHERE id = $1", [
        "run123"
      ]);
    });

    it("should return null when program run not found", async () => {
      mockPool.query.mockResolvedValue({
        rows: [],
        rowCount: 0
      } as any);

      const result = await service.getProgramRun("nonexistent");

      expect(result).toBeNull();
    });
  });

  describe("getUserProgramRuns", () => {
    it("should return paginated user program runs", async () => {
      const mockRuns = [
        { id: "run1", user_id: "user123", program_type: "basic" },
        { id: "run2", user_id: "user123", program_type: "advanced" }
      ];

      mockPool.query.mockResolvedValue({
        rows: mockRuns,
        rowCount: 2
      } as any);

      const result = await service.getUserProgramRuns("user123", 10, 0);

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe("run1");
      expect(mockPool.query).toHaveBeenCalledWith(
        "SELECT * FROM ai_program_runs WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3",
        ["user123", 10, 0]
      );
    });
  });

  describe("getUserUsageStats", () => {
    it("should return comprehensive usage statistics", async () => {
      const mockTotalStats = {
        total_runs: 5,
        total_tokens: 150,
        total_cost_usd: 10.0
      };

      const mockTypeBreakdown = [
        { program_type: "basic", count: 3 },
        { program_type: "advanced", count: 2 }
      ];

      const mockDailyUsage = [
        { date: "2024-01-01", runs: 2, tokens: 60, cost_usd: 4.0 },
        { date: "2024-01-02", runs: 3, tokens: 90, cost_usd: 6.0 }
      ];

      mockPool.query
        .mockResolvedValueOnce({ rows: [mockTotalStats] } as any)
        .mockResolvedValueOnce({ rows: mockTypeBreakdown } as any)
        .mockResolvedValueOnce({ rows: mockDailyUsage } as any);

      const result = await service.getUserUsageStats("user123", 30);

      expect(result.total_runs).toBe(5);
      expect(result.total_tokens).toBe(150);
      expect(result.total_cost_usd).toBe(10.0);
      expect(result.program_type_breakdown).toEqual({ basic: 3, advanced: 2 });
      expect(result.daily_usage).toHaveLength(2);
    });
  });

  describe("cancelProgramRun", () => {
    it("should cancel pending program run", async () => {
      mockPool.query.mockResolvedValue({
        rows: [{ id: "run123" }],
        rowCount: 1
      } as any);

      const result = await service.cancelProgramRun("run123", "user123");

      expect(result).toBe(true);
      expect(mockPool.query).toHaveBeenCalledWith(
        "UPDATE ai_program_runs SET status = 'cancelled', updated_at = NOW() WHERE id = $1 AND user_id = $2 AND status = 'pending' RETURNING id",
        ["run123", "user123"]
      );
    });

    it("should return false when run not found or not pending", async () => {
      mockPool.query.mockResolvedValue({
        rows: [],
        rowCount: 0
      } as any);

      const result = await service.cancelProgramRun("run123", "user123");

      expect(result).toBe(false);
    });
  });
});
