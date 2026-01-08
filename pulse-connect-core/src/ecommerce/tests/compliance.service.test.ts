import { Pool } from "pg";
import { ComplianceService, SubmitKYCRequest, KYCReviewRequest } from "../services/compliance.service";

// Mock the database pool
jest.mock("pg", () => {
  const mockPool = {
    connect: jest.fn(),
    query: jest.fn()
  };
  return { Pool: jest.fn(() => mockPool) };
});

describe("ComplianceService", () => {
  let complianceService: ComplianceService;
  let mockPool: any;

  beforeEach(() => {
    mockPool = new Pool();
    complianceService = new ComplianceService(mockPool);
    // default: feature flag disabled
    const { setFeatureFlag } = require("../../config/featureFlags");
    setFeatureFlag('KYC_AUTO_DECISION', false);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("submitKYC", () => {
    it("creates a new KYC when none exists", async () => {
      const mockClient = {
        query: jest.fn(),
        release: jest.fn()
      };

      mockPool.connect.mockResolvedValue(mockClient);

      // BEGIN
      mockClient.query.mockResolvedValueOnce({});

      // existingKYC SELECT -> empty
      mockClient.query.mockResolvedValueOnce({ rows: [] });

      // INSERT INTO kyc_verifications -> return row
      const insertedRow = {
        id: "id-1",
        seller_id: "seller1",
        status: "pending",
        verification_type: "basic",
        documents: JSON.stringify([{ type: "id_card", file_url: "http://f" }]),
        personal_info: JSON.stringify({ first_name: "Jane" }),
        business_info: null,
        risk_score: "50",
        submitted_at: new Date().toISOString(),
        reviewed_at: null,
        reviewed_by: null,
        rejection_reason: null,
        expires_at: new Date().toISOString(),
        trace_id: "trace-1",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      mockClient.query.mockResolvedValueOnce({ rows: [insertedRow] });

      // sellers update
      mockClient.query.mockResolvedValueOnce({});

      // COMMIT
      mockClient.query.mockResolvedValueOnce({});

      const request: SubmitKYCRequest = {
        seller_id: "seller1",
        verification_type: "basic",
        personal_info: {
          first_name: "Jane",
          last_name: "Doe",
          date_of_birth: "1990-01-01",
          nationality: "US",
          address: {
            street: "1 St",
            city: "City",
            state: "ST",
            postal_code: "12345",
            country: "US"
          }
        },
        documents: [
          { type: "id_card", file_url: "http://f", file_name: "id.pdf", uploaded_at: new Date().toISOString() }
        ],
        trace_id: "trace-1"
      };

      const result = await complianceService.submitKYC(request);

      expect(result).toBeDefined();
      expect(result.id).toBe(insertedRow.id);
      expect(result.seller_id).toBe("seller1");
      expect(result.status).toBe("pending");
      expect(result.risk_score).toBe(50);
      expect(mockClient.query).toHaveBeenCalled();

    });

    it("auto-approves when AI decision returns approve and flag enabled", async () => {
      const mockClient = { query: jest.fn(), release: jest.fn() };
      mockPool.connect.mockResolvedValue(mockClient);

      // Submit: BEGIN
      mockClient.query.mockResolvedValueOnce({});
      // existingKYC SELECT -> empty
      mockClient.query.mockResolvedValueOnce({ rows: [] });
      // INSERT -> return inserted row
      const insertedRow = {
        id: "id-2",
        seller_id: "seller2",
        status: "pending",
        verification_type: "basic",
        documents: JSON.stringify([]),
        personal_info: JSON.stringify({ first_name: "Auto" }),
        business_info: null,
        risk_score: "10",
        submitted_at: new Date().toISOString(),
        trace_id: "t2",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      mockClient.query.mockResolvedValueOnce({ rows: [insertedRow] });
      // sellers update
      mockClient.query.mockResolvedValueOnce({});
      // COMMIT
      mockClient.query.mockResolvedValueOnce({});

      // For reviewKYC calls triggered by AI: BEGIN
      mockClient.query.mockResolvedValueOnce({});
      // SELECT pending KYC
      mockClient.query.mockResolvedValueOnce({ rows: [insertedRow] });
      // UPDATE kyc_verifications -> return verified row
      const verifiedRow = {
        ...insertedRow,
        status: "verified",
        reviewed_at: new Date().toISOString(),
        reviewed_by: "system-ai"
      };
      mockClient.query.mockResolvedValueOnce({ rows: [verifiedRow] });
      // UPDATE sellers
      mockClient.query.mockResolvedValueOnce({});
      // COMMIT
      mockClient.query.mockResolvedValueOnce({});

      // getSellerKYC should return verified row
      (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: [verifiedRow] });

      // Provide aiDecisionClient that auto-approves
      const aiClient = { evaluateKYC: jest.fn().mockResolvedValue({ decision: "approve", confidence: 0.9 }) };

      const { setFeatureFlag } = require("../../config/featureFlags");
      setFeatureFlag('KYC_AUTO_DECISION', true);

      const svcWithAI = new ComplianceService(mockPool, aiClient);

      const request: SubmitKYCRequest = {
        seller_id: "seller2",
        verification_type: "basic",
        personal_info: {
          first_name: "Auto",
          last_name: "Approve",
          date_of_birth: "1990-01-01",
          nationality: "US",
          address: { street: "1 St", city: "City", state: "ST", postal_code: "12345", country: "US" }
        },
        documents: [],
        trace_id: "t2"
      };

      const result = await svcWithAI.submitKYC(request);

      expect(aiClient.evaluateKYC).toHaveBeenCalled();
      expect(result).toBeDefined();
      expect(result!.status).toBe("verified");
    });

    it("does not auto-approve when feature flag disabled", async () => {
      const mockClient = { query: jest.fn(), release: jest.fn() };
      mockPool.connect.mockResolvedValue(mockClient);

      // Submit: BEGIN
      mockClient.query.mockResolvedValueOnce({});
      // existingKYC SELECT -> empty
      mockClient.query.mockResolvedValueOnce({ rows: [] });
      // INSERT -> return inserted row
      const insertedRow = {
        id: "id-3",
        seller_id: "seller3",
        status: "pending",
        verification_type: "basic",
        documents: JSON.stringify([]),
        personal_info: JSON.stringify({ first_name: "NoAuto" }),
        business_info: null,
        risk_score: "10",
        submitted_at: new Date().toISOString(),
        trace_id: "t3",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      mockClient.query.mockResolvedValueOnce({ rows: [insertedRow] });
      // sellers update
      mockClient.query.mockResolvedValueOnce({});
      // COMMIT
      mockClient.query.mockResolvedValueOnce({});

      // getSellerKYC should return pending row
      (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: [insertedRow] });

      const aiClient = { evaluateKYC: jest.fn().mockResolvedValue({ decision: "approve", confidence: 0.9 }) };

      const { setFeatureFlag } = require("../../config/featureFlags");
      setFeatureFlag('KYC_AUTO_DECISION', false);

      const svcWithAI = new ComplianceService(mockPool, aiClient);

      const request: SubmitKYCRequest = {
        seller_id: "seller3",
        verification_type: "basic",
        personal_info: {
          first_name: "NoAuto",
          last_name: "Flag",
          date_of_birth: "1990-01-01",
          nationality: "US",
          address: { street: "1 St", city: "City", state: "ST", postal_code: "12345", country: "US" }
        },
        documents: [],
        trace_id: "t3"
      };

      const result = await svcWithAI.submitKYC(request);

      expect(aiClient.evaluateKYC).not.toHaveBeenCalled();
      expect(result).toBeDefined();
      expect(result!.status).toBe("pending");
    });
    });

    it("throws if seller already has verified KYC", async () => {
      const mockClient = {
        query: jest.fn(),
        release: jest.fn()
      };
      mockPool.connect.mockResolvedValue(mockClient);

      // BEGIN
      mockClient.query.mockResolvedValueOnce({});
      // existingKYC SELECT -> has verified
      mockClient.query.mockResolvedValueOnce({ rows: [{ id: "k1", status: "verified" }] });

      const request: SubmitKYCRequest = {
        seller_id: "seller1",
        verification_type: "basic",
        personal_info: {
          first_name: "Jane",
          last_name: "Doe",
          date_of_birth: "1990-01-01",
          nationality: "US",
          address: {
            street: "1 St",
            city: "City",
            state: "ST",
            postal_code: "12345",
            country: "US"
          }
        },
        documents: [
          { type: "id_card", file_url: "http://f", file_name: "id.pdf", uploaded_at: new Date().toISOString() }
        ],
        trace_id: "trace-1"
      };

      await expect(complianceService.submitKYC(request)).rejects.toThrow("Seller already has verified KYC");
    });
  });

  describe("reviewKYC", () => {
    it("approves a pending KYC", async () => {
      const mockClient = { query: jest.fn(), release: jest.fn() };
      mockPool.connect.mockResolvedValue(mockClient);

      // BEGIN
      mockClient.query.mockResolvedValueOnce({});

      // SELECT pending KYC
      mockClient.query.mockResolvedValueOnce({ rows: [
        {
          id: "id-1",
          seller_id: "seller1",
          status: "pending",
          verification_type: "basic",
          documents: JSON.stringify([]),
          personal_info: JSON.stringify({first_name: "Jane"}),
          business_info: null,
          risk_score: "30",
          submitted_at: new Date().toISOString(),
          trace_id: "t1",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ]});

      // UPDATE kyc_verifications -> return updated
      const updatedRow = {
        ...{
          id: "id-1",
          seller_id: "seller1",
          status: "verified",
          verification_type: "basic",
          documents: JSON.stringify([]),
          personal_info: JSON.stringify({first_name: "Jane"}),
          business_info: null,
          risk_score: "30",
          submitted_at: new Date().toISOString(),
          reviewed_at: new Date().toISOString(),
          reviewed_by: "rev1",
          trace_id: "t1",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      };

      mockClient.query.mockResolvedValueOnce({ rows: [updatedRow] });
      // UPDATE sellers
      mockClient.query.mockResolvedValueOnce({});
      // COMMIT
      mockClient.query.mockResolvedValueOnce({});

      const request: KYCReviewRequest = {
        kyc_id: "id-1",
        reviewer_id: "rev1",
        decision: "approve",
        trace_id: "t1"
      } as any;

      const result = await complianceService.reviewKYC(request);

      expect(result).toBeDefined();
      expect(result.status).toBe("verified");
    });

    it("throws if not reviewable", async () => {
      const mockClient = { query: jest.fn(), release: jest.fn() };
      mockPool.connect.mockResolvedValue(mockClient);

      // BEGIN
      mockClient.query.mockResolvedValueOnce({});
      // SELECT pending KYC -> empty
      mockClient.query.mockResolvedValueOnce({ rows: [] });

      const request: KYCReviewRequest = {
        kyc_id: "id-1",
        reviewer_id: "rev1",
        decision: "approve",
        trace_id: "t1"
      } as any;

      await expect(complianceService.reviewKYC(request)).rejects.toThrow("KYC verification not found or not reviewable");
    });
  });

  describe("getSellerKYC", () => {
    it("returns null when none exists", async () => {
      (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: [] });
      const result = await complianceService.getSellerKYC("seller1");
      expect(result).toBeNull();
    });

    it("returns mapped KYC when exists", async () => {
      const row = {
        id: "id-1",
        seller_id: "seller1",
        status: "pending",
        verification_type: "basic",
        documents: JSON.stringify([]),
        personal_info: JSON.stringify({first_name: "Jane"}),
        business_info: null,
        risk_score: "30",
        submitted_at: new Date().toISOString(),
        trace_id: "t1",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: [row] });

      const result = await complianceService.getSellerKYC("seller1");

      expect(result).toBeDefined();
      expect(result!.id).toBe("id-1");
      expect(result!.risk_score).toBe(30);
    });
  });

  describe("expireOldKYC", () => {
    it("returns number of expired rows", async () => {
      (mockPool.query as jest.Mock).mockResolvedValueOnce({ rowCount: 3 });
      const count = await complianceService.expireOldKYC();
      expect(count).toBe(3);
    });
  });
});
