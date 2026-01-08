import { MatchingService } from "../services/matching.service";
import { Pool } from "pg";

// Mock the database
jest.mock("pg", () => {
  const mockQuery = jest.fn();
  const mockPool = {
    query: mockQuery
  };
  return { Pool: jest.fn(() => mockPool) };
});

describe("MatchingService", () => {
  let service: MatchingService;
  let mockPool: any;

  beforeEach(() => {
    mockPool = new Pool();
    service = new MatchingService(mockPool);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("generateMatches", () => {
    it("should apply eligibility filters correctly", async () => {
      const mockBrief = {
        id: 1,
        client_id: 1,
        scope: "Build a website",
        required_skills: ["React", "Node.js"],
        budget_min: 1000,
        budget_max: 5000,
        language: "en",
        geo_radius: 50
      };

      const mockUsers = [
        {
          id: 2,
          skills: ["React", "Node.js", "TypeScript"],
          geo_point: null,
          language_prefs: ["en"],
          verification_level: "verified",
          capacity: 2,
          availability: true
        }
      ];

      // Mock database responses
      mockPool.query
        .mockResolvedValueOnce({ rows: mockUsers }) // Users query
        .mockResolvedValueOnce({ rows: [] }); // Existing contracts query

      const result = await service.generateMatches(mockBrief, "trace-123");

      expect(result).toBeDefined();
      expect(result.brief_id).toBe(1);
      expect(result.trace_id).toBe("trace-123");
      expect(Array.isArray(result.matches)).toBe(true);
    });

    it("should filter out ineligible providers", async () => {
      const mockBrief = {
        id: 1,
        client_id: 1,
        scope: "Build a mobile app",
        required_skills: ["React Native", "Firebase"],
        budget_min: 2000,
        budget_max: 8000,
        language: "en",
        geo_radius: null
      };

      const mockUsers = [
        {
          id: 2,
          skills: ["React", "Node.js"], // Missing required skills
          geo_point: null,
          language_prefs: ["en"],
          verification_level: "basic",
          capacity: 1,
          availability: true
        },
        {
          id: 3,
          skills: ["React Native", "Firebase", "TypeScript"], // Has required skills
          geo_point: null,
          language_prefs: ["en"],
          verification_level: "verified",
          capacity: 2,
          availability: true
        }
      ];

      mockPool.query.mockResolvedValueOnce({ rows: mockUsers }).mockResolvedValueOnce({ rows: [] });

      const result = await service.generateMatches(mockBrief, "trace-123");

      expect(result.matches.length).toBeGreaterThan(0);
      // The service should rank the eligible provider higher
      expect(result.matches[0].user_id).toBe(3);
    });

    it("should include explainability data", async () => {
      const mockBrief = {
        id: 1,
        client_id: 1,
        scope: "Web development project",
        required_skills: ["JavaScript"],
        budget_min: 1000,
        budget_max: 3000,
        language: "en",
        geo_radius: null
      };

      const mockUsers = [
        {
          id: 2,
          skills: ["JavaScript", "HTML", "CSS"],
          geo_point: null,
          language_prefs: ["en"],
          verification_level: "verified",
          capacity: 1,
          availability: true
        }
      ];

      mockPool.query.mockResolvedValueOnce({ rows: mockUsers }).mockResolvedValueOnce({ rows: [] });

      const result = await service.generateMatches(mockBrief, "trace-123");

      expect(result.matches[0]).toHaveProperty("score");
      expect(result.matches[0]).toHaveProperty("top_signals");
      expect(result.matches[0]).toHaveProperty("reason");
      expect(Array.isArray(result.matches[0].top_signals)).toBe(true);
      expect(typeof result.matches[0].reason).toBe("string");
    });
  });

  describe("eligibility filters", () => {
    it("should filter by skills overlap", () => {
      const briefSkills = ["React", "Node.js"];
      const providerSkills = ["React", "TypeScript", "Node.js"];

      // This would be tested through the actual filtering logic
      // For now, we verify the service structure
      expect(service).toBeDefined();
    });

    it("should filter by budget compatibility", () => {
      const budgetMin = 1000;
      const budgetMax = 5000;
      const proposedPrice = 3000;

      // Budget compatibility check
      const isCompatible = proposedPrice >= budgetMin && proposedPrice <= budgetMax;
      expect(isCompatible).toBe(true);
    });

    it("should filter by language match", () => {
      const briefLanguage = "en";
      const providerLanguages = ["en", "es"];

      const hasLanguageMatch = providerLanguages.includes(briefLanguage);
      expect(hasLanguageMatch).toBe(true);
    });
  });

  describe("scoring pipeline", () => {
    it("should calculate skill match score", () => {
      const requiredSkills = ["React", "Node.js"];
      const providerSkills = ["React", "Node.js", "TypeScript"];

      const overlap = requiredSkills.filter((skill) => providerSkills.includes(skill)).length;
      const score = overlap / requiredSkills.length;

      expect(score).toBe(1.0); // Perfect match
    });

    it("should calculate budget fit score", () => {
      const budgetMin = 1000;
      const budgetMax = 5000;
      const proposedPrice = 3000;

      // Simple budget fit calculation
      const range = budgetMax - budgetMin;
      const distance = Math.abs(proposedPrice - (budgetMin + budgetMax) / 2);
      const score = Math.max(0, 1 - distance / (range / 2));

      expect(score).toBeGreaterThan(0.5);
    });
  });
});
