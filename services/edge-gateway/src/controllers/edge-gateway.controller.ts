import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  Logger,
  Headers,
  BadRequestException,
  UnauthorizedException
} from "@nestjs/common";
import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";
import { EdgeGatewayService } from "../services/edge-gateway.service";
import { ExecuteRequestDto } from "../dto/execute-request.dto";
import { PolicyVersionDto } from "../dto/policy-version.dto";
import { BrandSupportRequestDto } from "../dto/brand-support.dto";
import { BrandSupportService } from "../services/brand-support.service";

@Controller()
export class EdgeGatewayController {
  private readonly logger = new Logger(EdgeGatewayController.name);

  constructor(
    private readonly edgeGatewayService: EdgeGatewayService,
    private readonly brandSupportService: BrandSupportService
  ) {}

  /**
   * Execute policy-governed actions across all subsystems
   * POST /edge/execute
   */
  @Post("execute")
  async execute(@Body() request: ExecuteRequestDto, @Headers() headers: Record<string, string>) {
    this.logger.log(`Processing execution request for subsystem: ${request.subsystem}`);

    const result = await this.edgeGatewayService.executeRequest(request, headers);

    this.logger.log(`Execution completed with decision: ${result.decision}`);
    return result;
  }

  /**
   * Get current policy version information
   * GET /edge/policy/version
   */
  @Get("policy/version")
  async getPolicyVersion(@Query() query: PolicyVersionDto) {
    this.logger.log(`Retrieving policy version for subsystem: ${query.subsystem}`);

    return await this.edgeGatewayService.getPolicyVersion(query);
  }

  /**
   * Get backend-owned brand icon configuration.
   * GET /edge/brand/config
   */
  @Get("brand/config")
  async getBrandConfig(
    @Query("sourceApp") sourceApp: string | undefined,
    @Query("regionCode") regionCode: string | undefined,
    @Headers() headers: Record<string, string>
  ) {
    return this.brandSupportService.getBrandConfig({
      sourceApp,
      regionCode,
      headers
    });
  }

  /**
   * Get manifest-ready icon payload from backend.
   * GET /edge/brand/manifest
   */
  @Get("brand/manifest")
  async getBrandManifest(
    @Query("sourceApp") sourceApp: string | undefined,
    @Query("regionCode") regionCode: string | undefined,
    @Headers() headers: Record<string, string>
  ) {
    return this.brandSupportService.getBrandManifest({
      sourceApp,
      regionCode,
      headers
    });
  }

  /**
   * Ingest brand support events; CSI forwarding is firewall-only.
   * POST /edge/brand/support
   */
  @Post("brand/support")
  async ingestBrandSupport(
    @Body() request: BrandSupportRequestDto,
    @Headers() headers: Record<string, string>
  ) {
    return this.brandSupportService.ingestBrandSupport(request, headers);
  }

  /**
   * Health check endpoint
   * GET /edge/health
   */
  @Get("health")
  async health() {
    return {
      status: "healthy",
      service: "edge-gateway",
      timestamp: new Date().toISOString(),
      governance: "MARP_ACTIVE",
      resilience: "LOCAL_READY"
    };
  }

  /**
   * Ingest emergency protocol mutation broadcasts from admin gateway.
   * POST /edge/internal/emergency-protocol/event
   */
  @Post("internal/emergency-protocol/event")
  async ingestEmergencyProtocolEvent(
    @Body() payload: Record<string, unknown>,
    @Headers() headers: Record<string, string>
  ) {
    const result = this.edgeGatewayService.ingestEmergencyMutationEvent(payload, headers);
    if (!result.accepted) {
      if (result.reason === "unauthorized") {
        throw new UnauthorizedException(
          "Invalid internal service token for emergency mutation ingestion"
        );
      }
      throw new BadRequestException(
        `Emergency mutation event rejected: ${result.reason || "invalid_payload"}`
      );
    }

    return {
      accepted: true,
      active: result.snapshot?.active || false,
      protocolId: result.snapshot?.protocolId || null,
      version: result.snapshot?.version || null,
      receivedAt: new Date().toISOString()
    };
  }

  /**
   * Serve canonical Terms of Service content and metadata
   * GET /legal/terms
   */
  @Get("legal/terms")
  async getTerms() {
    // Resolve path to repo root TERMS_OF_SERVICE.md
    const repoRoot = path.resolve(__dirname, "../../..", "..");
    const termsPath = path.join(repoRoot, "TERMS_OF_SERVICE.md");

    let content = "";
    try {
      content = fs.readFileSync(termsPath, "utf8");
    } catch (err) {
      // Fallback minimal content if file not found in certain deploys
      content = "# Pulsco Terms of Service\n\nPlease visit /terms in the portal.";
    }

    // Extract simple metadata from placeholders if present
    const effectiveDateMatch = content.match(/Effective Date:\s*(.*)/i);
    const governingLawMatch = content.match(/Governing Law Jurisdiction:\s*(.*)/i);
    const entityMatch = content.match(/Legal Entity:\s*(.*)/i);

    const hash = crypto.createHash("sha256").update(content).digest("hex");

    return {
      version: hash.slice(0, 12),
      effectiveDate: effectiveDateMatch ? effectiveDateMatch[1].trim() : null,
      governingLaw: governingLawMatch ? governingLawMatch[1].trim() : null,
      legalEntity: entityMatch ? entityMatch[1].trim() : null,
      contentMarkdown: content,
      hash
    };
  }

  /**
   * Serve canonical Privacy Policy content and metadata
   * GET /legal/privacy
   */
  @Get("legal/privacy")
  async getPrivacy() {
    // Resolve path to repo root PRIVACY_POLICY.md
    const repoRoot = path.resolve(__dirname, "../../..", "..");
    const privacyPath = path.join(repoRoot, "PRIVACY_POLICY.md");

    let content = "";
    try {
      content = fs.readFileSync(privacyPath, "utf8");
    } catch (err) {
      // Fallback minimal content if file not found in certain deploys
      content = "# Pulsco Privacy Policy\n\nPlease visit /privacy in the portal.";
    }

    const effectiveDateMatch = content.match(/Effective Date:\s*(.*)/i);
    // Try to extract privacy contact email if present
    const privacyEmailMatch =
      content.match(/Privacy (Contact )?Email:\s*(.*)/i) || content.match(/Contact Email:\s*(.*)/i);

    const hash = crypto.createHash("sha256").update(content).digest("hex");

    return {
      version: hash.slice(0, 12),
      effectiveDate: effectiveDateMatch ? effectiveDateMatch[1].trim() : null,
      privacyEmail: privacyEmailMatch
        ? (privacyEmailMatch[2] || privacyEmailMatch[1]).trim()
        : null,
      contentMarkdown: content,
      hash
    };
  }

  /**
   * Serve Acceptable Use Policy
   * GET /legal/aup
   */
  @Get("legal/aup")
  async getAup() {
    const repoRoot = path.resolve(__dirname, "../../..", "..");
    const docPath = path.join(repoRoot, "AUP.md");
    let content = "";
    try {
      content = fs.readFileSync(docPath, "utf8");
    } catch {
      content = "# Pulsco Acceptable Use Policy\n\nSee /aup in the portal.";
    }
    const hash = crypto.createHash("sha256").update(content).digest("hex");
    return {
      version: hash.slice(0, 12),
      contentMarkdown: content,
      hash
    };
  }

  /**
   * Serve Marketplace Seller Agreement
   * GET /legal/marketplace-seller
   */
  @Get("legal/marketplace-seller")
  async getMarketplaceSeller() {
    const repoRoot = path.resolve(__dirname, "../../..", "..");
    const docPath = path.join(repoRoot, "MARKETPLACE_SELLER_AGREEMENT.md");
    let content = "";
    try {
      content = fs.readFileSync(docPath, "utf8");
    } catch {
      content = "# Pulsco Marketplace Seller Agreement\n\nSee /seller-agreement in the portal.";
    }
    const hash = crypto.createHash("sha256").update(content).digest("hex");
    return {
      version: hash.slice(0, 12),
      contentMarkdown: content,
      hash
    };
  }

  /**
   * Serve AI & Automation Disclosure Policy
   * GET /legal/ai-disclosure
   */
  @Get("legal/ai-disclosure")
  async getAiDisclosure() {
    const repoRoot = path.resolve(__dirname, "../../..", "..");
    const docPath = path.join(repoRoot, "AI_AUTOMATION_DISCLOSURE.md");
    let content = "";
    try {
      content = fs.readFileSync(docPath, "utf8");
    } catch {
      content = "# Pulsco AI & Automation Disclosure\n\nSee /ai-disclosure in the portal.";
    }
    const hash = crypto.createHash("sha256").update(content).digest("hex");
    return {
      version: hash.slice(0, 12),
      contentMarkdown: content,
      hash
    };
  }

  /**
   * Serve Platform Governance & Enforcement Charter
   * GET /legal/governance-charter
   */
  @Get("legal/governance-charter")
  async getGovernanceCharter() {
    const repoRoot = path.resolve(__dirname, "../../..", "..");
    const docPath = path.join(repoRoot, "PLATFORM_GOVERNANCE_CHARTER.md");
    let content = "";
    try {
      content = fs.readFileSync(docPath, "utf8");
    } catch {
      content =
        "# Pulsco Platform Governance & Enforcement Charter\n\nSee /governance-charter in the portal.";
    }
    const hash = crypto.createHash("sha256").update(content).digest("hex");
    return {
      version: hash.slice(0, 12),
      contentMarkdown: content,
      hash
    };
  }

  /**
   * Serve Global Compliance Disclaimer
   * GET /legal/compliance-disclaimer
   */
  @Get("legal/compliance-disclaimer")
  async getComplianceDisclaimer() {
    const repoRoot = path.resolve(__dirname, "../../..", "..");
    const docPath = path.join(repoRoot, "GLOBAL_COMPLIANCE_DISCLAIMER.md");
    let content = "";
    try {
      content = fs.readFileSync(docPath, "utf8");
    } catch {
      content = "# Pulsco Global Compliance Disclaimer\n\nSee /compliance in the portal.";
    }
    const hash = crypto.createHash("sha256").update(content).digest("hex");
    return {
      version: hash.slice(0, 12),
      contentMarkdown: content,
      hash
    };
  }
}
