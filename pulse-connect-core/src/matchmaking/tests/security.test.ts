import { MatchingService } from "../services/matching.service";
import { ContractsService } from "../services/contracts.service";
import { PaymentsService } from "../services/payments.service";
import { Pool } from "pg";

// Mock the database
jest.mock("pg", () => {
  const mockQuery = jest.fn();
  const mockPool = {
    query: mockQuery
  };
  return { Pool: jest.fn(() => mockPool) };
});

describe("Security Tests", () => {
  let matchingService: MatchingService;
  let contractsService: ContractsService;
  let paymentsService: PaymentsService;
  let mockPool: any;

  beforeEach(() => {
    mockPool = new Pool();
    matchingService = new MatchingService(mockPool);
    contractsService = new ContractsService(mockPool);
    paymentsService = new PaymentsService(mockPool);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("Input Validation and Sanitization", () => {
    it("should prevent SQL injection in brief scope", async () => {
      const maliciousBrief = {
        id: 1,
        client_id: 1,
        scope: "'; DROP TABLE users; --",
        deliverables: "Test deliverables",
        budget_min: 1000,
        budget_max: 5000,
        currency: "USD",
        required_skills: ["JavaScript"],
        language: "en"
      };

      // Mock should use parameterized queries
      mockPool.query.mockResolvedValue({ rows: [] });

      await expect(
        matchingService.generateMatches(maliciousBrief, "trace-123")
      ).resolves.toBeDefined();

      // Verify that the query was called with parameters, not concatenated strings
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining("$1"), // Parameterized query
        expect.any(Array)
      );
    });

    it("should validate and sanitize user inputs", async () => {
      const invalidInputs = [
        { budget_min: -1000, budget_max: 5000 }, // Negative budget
        { budget_min: 5000, budget_max: 1000 }, // Min > Max
        { currency: "INVALID" }, // Invalid currency
        { language: "invalid-lang" }, // Invalid language
        { geo_radius: -50 } // Negative radius
      ];

      for (const invalidInput of invalidInputs) {
        const brief = {
          id: 1,
          client_id: 1,
          scope: "Test scope",
          deliverables: "Test deliverables",
          budget_min: 1000,
          budget_max: 5000,
          currency: "USD",
          required_skills: ["JavaScript"],
          language: "en",
          ...invalidInput
        };

        await expect(matchingService.generateMatches(brief, "trace-123")).rejects.toThrow();
      }
    });

    it("should handle large input payloads safely", async () => {
      const largeBrief = {
        id: 1,
        client_id: 1,
        scope: "x".repeat(10000), // 10KB string
        deliverables: "x".repeat(5000),
        budget_min: 1000,
        budget_max: 5000,
        currency: "USD",
        required_skills: Array(1000).fill("Skill"), // Large array
        language: "en"
      };

      mockPool.query.mockResolvedValue({ rows: [] });

      // Should handle large inputs without crashing
      await expect(matchingService.generateMatches(largeBrief, "trace-123")).resolves.toBeDefined();
    });
  });

  describe("Authentication and Authorization", () => {
    it("should require valid user authentication", async () => {
      // Mock missing user context
      const brief = {
        id: 1,
        client_id: 1,
        scope: "Test",
        deliverables: "Test",
        budget_min: 1000,
        budget_max: 5000,
        currency: "USD",
        required_skills: ["JavaScript"],
        language: "en"
      };

      // Should fail without proper authentication
      await expect(matchingService.generateMatches(brief, "trace-123")).rejects.toThrow(
        "Unauthorized"
      );
    });

    it("should enforce RBAC for admin operations", async () => {
      // Mock non-admin user trying to access admin endpoints
      mockPool.query.mockResolvedValue({
        rows: [
          {
            id: 1,
            version: "v1",
            upfront_percent: 5,
            completion_percent: 15
          }
        ]
      });

      // Should fail for non-admin user
      await expect(paymentsService.getFeePolicies()).rejects.toThrow("Admin access required");
    });

    it("should validate user permissions for contract operations", async () => {
      const contractData = {
        client_id: 1,
        provider_id: 2,
        brief_id: 1,
        proposal_id: 1,
        total_value: 5000,
        currency: "USD"
      };

      // Mock user without permission
      mockPool.query.mockResolvedValue({ rows: [] });

      await expect(contractsService.createContract(contractData)).rejects.toThrow(
        "Insufficient permissions"
      );
    });
  });

  describe("Data Exposure Prevention", () => {
    it("should not expose sensitive user data in responses", async () => {
      const mockUser = {
        id: 1,
        email: "sensitive@example.com",
        password_hash: "hashed_password",
        credit_card: "4111111111111111",
        ssn: "123-45-6789"
      };

      mockPool.query.mockResolvedValue({ rows: [mockUser] });

      const result = await matchingService.generateMatches(
        {
          id: 1,
          client_id: 1,
          scope: "Test",
          deliverables: "Test",
          budget_min: 1000,
          budget_max: 5000,
          currency: "USD",
          required_skills: ["JavaScript"],
          language: "en"
        },
        "trace-123"
      );

      // Response should not contain sensitive data
      expect(result).not.toHaveProperty("email");
      expect(result).not.toHaveProperty("password_hash");
      expect(result).not.toHaveProperty("credit_card");
      expect(result).not.toHaveProperty("ssn");
    });

    it("should filter sensitive fields from database queries", async () => {
      // Mock query result with sensitive data
      const mockResult = {
        rows: [
          {
            id: 1,
            name: "John Doe",
            email: "john@example.com",
            password_hash: "hashed",
            balance: 1000,
            credit_card_last_four: "1111"
          }
        ]
      };

      mockPool.query.mockResolvedValue(mockResult);

      // Service should filter out sensitive fields
      const result = await contractsService.getContracts(1);

      expect(result.contracts[0]).toHaveProperty("id");
      expect(result.contracts[0]).toHaveProperty("name");
      expect(result.contracts[0]).not.toHaveProperty("email");
      expect(result.contracts[0]).not.toHaveProperty("password_hash");
      expect(result.contracts[0]).not.toHaveProperty("credit_card_last_four");
    });
  });

  describe("Rate Limiting and Abuse Prevention", () => {
    it("should implement rate limiting for API endpoints", async () => {
      // Simulate rapid requests
      const requests = Array(100)
        .fill(null)
        .map(() =>
          matchingService.generateMatches(
            {
              id: 1,
              client_id: 1,
              scope: "Test",
              deliverables: "Test",
              budget_min: 1000,
              budget_max: 5000,
              currency: "USD",
              required_skills: ["JavaScript"],
              language: "en"
            },
            "trace-123"
          )
        );

      // Should rate limit excessive requests
      await expect(Promise.all(requests)).rejects.toThrow("Rate limit exceeded");
    });

    it("should prevent brute force attacks on sensitive operations", async () => {
      // Simulate multiple failed authentication attempts
      for (let i = 0; i < 10; i++) {
        mockPool.query.mockRejectedValue(new Error("Invalid credentials"));
      }

      // Should eventually block further attempts
      await expect(
        paymentsService.processPayment({
          amount: 1000,
          type: "fund",
          trace_id: "trace-123"
        })
      ).rejects.toThrow("Account temporarily locked");
    });
  });

  describe("Audit Trail Integrity", () => {
    it("should maintain complete audit trails", async () => {
      const traceId = "trace-security-test-123";

      // Perform multiple operations with same trace_id
      mockPool.query.mockResolvedValue({ rows: [] });

      await matchingService.generateMatches(
        {
          id: 1,
          client_id: 1,
          scope: "Test",
          deliverables: "Test",
          budget_min: 1000,
          budget_max: 5000,
          currency: "USD",
          required_skills: ["JavaScript"],
          language: "en"
        },
        traceId
      );

      await contractsService.createProposal({
        brief_id: 1,
        provider_id: 2,
        pitch: "Test pitch",
        proposed_price: 3000,
        currency: "USD"
      });

      // Verify all operations are logged with same trace_id
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining("trace_id"),
        expect.arrayContaining([traceId])
      );
    });

    it("should prevent audit trail tampering", async () => {
      // Attempt to modify audit logs should fail
      await expect(paymentsService.modifyAuditLog(1, { event_type: "modified" })).rejects.toThrow(
        "Audit logs are immutable"
      );
    });

    it("should validate trace_id format and uniqueness", async () => {
      const invalidTraceIds = [
        "", // Empty
        "invalid-format", // Wrong format
        "trace-123", // Too short
        "trace-123456789012345678901234567890123456789012345678901234567890", // Too long
        "TRACE-123", // Uppercase
        "trace-123!" // Special characters
      ];

      for (const invalidTraceId of invalidTraceIds) {
        await expect(
          matchingService.generateMatches(
            {
              id: 1,
              client_id: 1,
              scope: "Test",
              deliverables: "Test",
              budget_min: 1000,
              budget_max: 5000,
              currency: "USD",
              required_skills: ["JavaScript"],
              language: "en"
            },
            invalidTraceId
          )
        ).rejects.toThrow("Invalid trace_id format");
      }
    });
  });

  describe("Financial Security", () => {
    it("should prevent double-spending attacks", async () => {
      const traceId = "trace-double-spend-123";

      // First payment
      mockPool.query
        .mockResolvedValueOnce({ rows: [] }) // No existing transaction
        .mockResolvedValueOnce({ rows: [{ id: 1, trace_id: traceId, status: "completed" }] });

      await paymentsService.processPayment({
        amount: 1000,
        type: "fund",
        trace_id: traceId
      });

      // Second payment with same trace_id should be rejected
      mockPool.query.mockResolvedValueOnce({
        rows: [{ id: 1, trace_id: traceId, status: "completed" }]
      });

      await expect(
        paymentsService.processPayment({
          amount: 1000,
          type: "fund",
          trace_id: traceId
        })
      ).rejects.toThrow("Transaction already exists");
    });

    it("should validate payment amounts and prevent negative transactions", async () => {
      const invalidAmounts = [-1000, 0, 999999999]; // Negative, zero, too large

      for (const amount of invalidAmounts) {
        await expect(
          paymentsService.processPayment({
            amount,
            type: "fund",
            trace_id: "trace-123"
          })
        ).rejects.toThrow("Invalid payment amount");
      }
    });

    it("should enforce fee policy integrity", async () => {
      // Attempt to process payment with invalid fee policy
      mockPool.query.mockResolvedValue({ rows: [] }); // No valid policy

      await expect(
        paymentsService.processPayment({
          amount: 1000,
          type: "fee",
          trace_id: "trace-123",
          policy_version: "invalid-policy"
        })
      ).rejects.toThrow("Invalid fee policy version");
    });
  });

  describe("Data Privacy and GDPR Compliance", () => {
    it("should support right to erasure (GDPR)", async () => {
      const userId = 1;

      // Mock user data deletion
      mockPool.query.mockResolvedValue({ rowCount: 1 });

      const result = await contractsService.deleteUserData(userId);

      expect(result).toBe(true);

      // Verify data was actually removed
      mockPool.query.mockResolvedValue({ rows: [] });
      const contracts = await contractsService.getContracts(userId);
      expect(contracts.contracts).toHaveLength(0);
    });

    it("should anonymize data for analytics", async () => {
      const userData = {
        id: 1,
        name: "John Doe",
        email: "john@example.com",
        location: "New York, NY"
      };

      const anonymized = await matchingService.anonymizeUserData(userData);

      expect(anonymized.id).toBeUndefined();
      expect(anonymized.name).toBeUndefined();
      expect(anonymized.email).toBeUndefined();
      expect(anonymized.location).toBe("New York"); // City only
    });

    it("should enforce data retention policies", async () => {
      // Mock old data that should be archived
      const oldDate = new Date();
      oldDate.setFullYear(oldDate.getFullYear() - 3); // 3 years old

      mockPool.query.mockResolvedValue({
        rows: [
          {
            id: 1,
            created_at: oldDate.toISOString(),
            status: "completed"
          }
        ]
      });

      const archived = await contractsService.archiveOldData(2); // Archive data older than 2 years

      expect(archived).toBeGreaterThan(0);
    });
  });
});
