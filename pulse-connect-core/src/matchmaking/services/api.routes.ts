import express from "express";
import { Pool } from "pg";
import { MatchingService } from "./matching.service";
import { ContractsService } from "./contracts.service";
import { PaymentsService } from "./payments.service";
import { ReputationService } from "./reputation.service";
import { v4 as uuidv4 } from "uuid";

export class MatchmakingAPIRoutes {
  private router: express.Router;
  private matchingService: MatchingService;
  private contractsService: ContractsService;
  private paymentsService: PaymentsService;
  private reputationService: ReputationService;

  constructor(private db: Pool) {
    this.router = express.Router();
    this.matchingService = new MatchingService(db);
    this.contractsService = new ContractsService(db);
    this.paymentsService = new PaymentsService(db);
    this.reputationService = new ReputationService(db);

    this.setupRoutes();
  }

  getRouter(): express.Router {
    return this.router;
  }

  private setupRoutes() {
    // Middleware for auth validation (simplified - would integrate with actual auth system)
    const requireAuth = (req: express.Request, res: express.Response, next: express.Function) => {
      // TODO: Implement proper auth validation
      const userId = req.headers["x-user-id"] as string;
      if (!userId) {
        return res.status(401).json({ error: "Authentication required" });
      }
      (req as any).userId = parseInt(userId);
      next();
    };

    // Middleware for RBAC (simplified)
    const requireRole = (allowedRoles: string[]) => {
      return (req: express.Request, res: express.Response, next: express.Function) => {
        // TODO: Implement proper RBAC
        next();
      };
    };

    // Gigs endpoints
    this.router.post("/v1/gigs", requireAuth, this.createGig.bind(this));

    // Briefs endpoints
    this.router.post("/v1/briefs", requireAuth, this.createBrief.bind(this));
    this.router.get("/v1/briefs/:id/matches", requireAuth, this.getBriefMatches.bind(this));

    // Proposals endpoints
    this.router.post("/v1/proposals", requireAuth, this.submitProposal.bind(this));
    this.router.get("/v1/briefs/:briefId/proposals", requireAuth, this.listProposals.bind(this));
    this.router.put("/v1/proposals/:id/status", requireAuth, this.updateProposalStatus.bind(this));

    // Contracts endpoints
    this.router.post("/v1/contracts", requireAuth, this.createContract.bind(this));
    this.router.put("/v1/contracts/:id/status", requireAuth, this.updateContractStatus.bind(this));
    this.router.get("/v1/contracts/:id", requireAuth, this.getContract.bind(this));

    // Milestones endpoints
    this.router.post(
      "/v1/contracts/:contractId/milestones",
      requireAuth,
      this.createMilestone.bind(this)
    );
    this.router.put(
      "/v1/milestones/:id/status",
      requireAuth,
      this.updateMilestoneStatus.bind(this)
    );
    this.router.post("/v1/milestones/:id/fund", requireAuth, this.fundMilestone.bind(this));
    this.router.post("/v1/milestones/:id/release", requireAuth, this.releaseMilestone.bind(this));

    // Payments endpoints
    this.router.get("/v1/contracts/:id/invoices", requireAuth, this.getInvoice.bind(this));

    // Reputation endpoints
    this.router.get("/v1/users/:id/reputation", requireAuth, this.getReputation.bind(this));
  }

  // Gig endpoints
  private async createGig(req: express.Request, res: express.Response) {
    try {
      const { title, description, base_price, currency = "USD" } = req.body;
      const ownerId = (req as any).userId;

      // Insert gig
      const gigQuery = `
        INSERT INTO gigs (owner_id, title, description, base_price, currency, status, created_at, updated_at)
        VALUES ($1, $2, $3, $4, 'draft', NOW(), NOW())
        RETURNING *
      `;

      const gigResult = await this.db.query(gigQuery, [
        ownerId,
        title,
        description,
        base_price,
        currency
      ]);
      const gig = gigResult.rows[0];

      // Charge upfront fee
      const traceId = uuidv4();
      await this.paymentsService.chargeUpfrontFee(gig.id, traceId);

      // Emit event (simplified - would use outbox)
      // await this.emitEvent('gig_published', { gig_id: gig.id, trace_id: traceId });

      res.status(201).json({
        gig,
        upfront_fee_charged: true,
        trace_id: traceId
      });
    } catch (error) {
      console.error("Error creating gig:", error);
      res.status(500).json({ error: "Failed to create gig" });
    }
  }

  // Brief endpoints
  private async createBrief(req: express.Request, res: express.Response) {
    try {
      const {
        scope,
        deliverables,
        budget_min,
        budget_max,
        currency = "USD",
        required_skills,
        language,
        geo_radius
      } = req.body;
      const clientId = (req as any).userId;

      const briefQuery = `
        INSERT INTO briefs (client_id, scope, deliverables, budget_min, budget_max, currency, required_skills, language, geo_radius, status, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'draft', NOW(), NOW())
        RETURNING *
      `;

      const briefResult = await this.db.query(briefQuery, [
        clientId,
        scope,
        deliverables,
        budget_min,
        budget_max,
        currency,
        required_skills,
        language,
        geo_radius
      ]);

      const brief = briefResult.rows[0];

      // Emit event
      // await this.emitEvent('brief_created', { brief_id: brief.id });

      res.status(201).json(brief);
    } catch (error) {
      console.error("Error creating brief:", error);
      res.status(500).json({ error: "Failed to create brief" });
    }
  }

  private async getBriefMatches(req: express.Request, res: express.Response) {
    try {
      const briefId = parseInt(req.params.id);
      const traceId = uuidv4();

      // Get brief details
      const briefQuery = `SELECT * FROM briefs WHERE id = $1`;
      const briefResult = await this.db.query(briefQuery, [briefId]);

      if (briefResult.rows.length === 0) {
        return res.status(404).json({ error: "Brief not found" });
      }

      const brief = briefResult.rows[0];

      // Generate matches
      const matches = await this.matchingService.generateMatches(brief, traceId);

      res.json({
        brief_id: briefId,
        matches,
        trace_id: traceId
      });
    } catch (error) {
      console.error("Error getting matches:", error);
      res.status(500).json({ error: "Failed to get matches" });
    }
  }

  // Proposal endpoints
  private async submitProposal(req: express.Request, res: express.Response) {
    try {
      const { brief_id, pitch, proposed_price, currency = "USD" } = req.body;
      const providerId = (req as any).userId;

      const proposal = await this.contractsService.submitProposal(
        brief_id,
        providerId,
        pitch,
        proposed_price,
        currency
      );

      // Emit event
      // await this.emitEvent('proposal_submitted', { proposal_id: proposal.id });

      res.status(201).json(proposal);
    } catch (error) {
      console.error("Error submitting proposal:", error);
      res.status(500).json({ error: "Failed to submit proposal" });
    }
  }

  private async listProposals(req: express.Request, res: express.Response) {
    try {
      const briefId = parseInt(req.params.briefId);
      const proposals = await this.contractsService.listProposals(briefId);
      res.json(proposals);
    } catch (error) {
      console.error("Error listing proposals:", error);
      res.status(500).json({ error: "Failed to list proposals" });
    }
  }

  private async updateProposalStatus(req: express.Request, res: express.Response) {
    try {
      const proposalId = parseInt(req.params.id);
      const { status } = req.body;

      const proposal = await this.contractsService.updateProposalStatus(proposalId, status);
      res.json(proposal);
    } catch (error) {
      console.error("Error updating proposal status:", error);
      res.status(500).json({ error: "Failed to update proposal status" });
    }
  }

  // Contract endpoints
  private async createContract(req: express.Request, res: express.Response) {
    try {
      const { proposal_id } = req.body;

      const contract = await this.contractsService.createContractFromProposal(proposal_id);

      // Emit event
      // await this.emitEvent('contract_created', { contract_id: contract.id });

      res.status(201).json(contract);
    } catch (error) {
      console.error("Error creating contract:", error);
      res.status(500).json({ error: "Failed to create contract" });
    }
  }

  private async updateContractStatus(req: express.Request, res: express.Response) {
    try {
      const contractId = parseInt(req.params.id);
      const { status } = req.body;

      const contract = await this.contractsService.updateContractStatus(contractId, status);
      res.json(contract);
    } catch (error) {
      console.error("Error updating contract status:", error);
      res.status(500).json({ error: "Failed to update contract status" });
    }
  }

  private async getContract(req: express.Request, res: express.Response) {
    try {
      const contractId = parseInt(req.params.id);
      const contractData = await this.contractsService.getContractWithMilestones(contractId);
      res.json(contractData);
    } catch (error) {
      console.error("Error getting contract:", error);
      res.status(500).json({ error: "Failed to get contract" });
    }
  }

  // Milestone endpoints
  private async createMilestone(req: express.Request, res: express.Response) {
    try {
      const contractId = parseInt(req.params.contractId);
      const { name, amount, currency = "USD", due_date } = req.body;

      const milestone = await this.contractsService.createMilestone(
        contractId,
        name,
        amount,
        currency,
        new Date(due_date)
      );

      res.status(201).json(milestone);
    } catch (error) {
      console.error("Error creating milestone:", error);
      res.status(500).json({ error: "Failed to create milestone" });
    }
  }

  private async updateMilestoneStatus(req: express.Request, res: express.Response) {
    try {
      const milestoneId = parseInt(req.params.id);
      const { status } = req.body;

      const milestone = await this.contractsService.updateMilestoneStatus(milestoneId, status);
      res.json(milestone);
    } catch (error) {
      console.error("Error updating milestone status:", error);
      res.status(500).json({ error: "Failed to update milestone status" });
    }
  }

  private async fundMilestone(req: express.Request, res: express.Response) {
    try {
      const milestoneId = parseInt(req.params.id);
      const traceId = uuidv4();

      const transaction = await this.paymentsService.fundMilestone(milestoneId, traceId);

      // Emit event
      // await this.emitEvent('milestone_funded', { milestone_id: milestoneId, trace_id: traceId });

      res.json({
        transaction,
        trace_id: traceId
      });
    } catch (error) {
      console.error("Error funding milestone:", error);
      res.status(500).json({ error: "Failed to fund milestone" });
    }
  }

  private async releaseMilestone(req: express.Request, res: express.Response) {
    try {
      const milestoneId = parseInt(req.params.id);
      const traceId = uuidv4();

      const { payment, fee } = await this.paymentsService.releaseMilestone(milestoneId, traceId);

      // Emit event
      // await this.emitEvent('milestone_released', { milestone_id: milestoneId, trace_id: traceId });

      res.json({
        payment_transaction: payment,
        fee_transaction: fee,
        trace_id: traceId
      });
    } catch (error) {
      console.error("Error releasing milestone:", error);
      res.status(500).json({ error: "Failed to release milestone" });
    }
  }

  // Payment endpoints
  private async getInvoice(req: express.Request, res: express.Response) {
    try {
      const contractId = parseInt(req.params.id);
      const { milestone_id } = req.query;

      const invoice = await this.paymentsService.generateInvoice(
        contractId,
        milestone_id ? parseInt(milestone_id as string) : undefined
      );

      res.json(invoice);
    } catch (error) {
      console.error("Error generating invoice:", error);
      res.status(500).json({ error: "Failed to generate invoice" });
    }
  }

  // Reputation endpoints
  private async getReputation(req: express.Request, res: express.Response) {
    try {
      const userId = parseInt(req.params.id);
      const reputation = await this.reputationService.calculateReputationScore(userId);
      res.json(reputation);
    } catch (error) {
      console.error("Error getting reputation:", error);
      res.status(500).json({ error: "Failed to get reputation" });
    }
  }
}
