import { Pool } from "pg";
import { isFeatureEnabled } from "../../config/featureFlags";
import { v4 as uuidv4 } from "uuid";

export interface KYCVerification {
  id: string;
  seller_id: string;
  status: "pending" | "under_review" | "verified" | "rejected" | "expired";
  verification_type: "basic" | "enhanced" | "premium";
  documents: any; // JSONB array of document metadata
  personal_info: any; // JSONB personal information
  business_info?: any; // JSONB business information
  risk_score: number;
  submitted_at: Date;
  reviewed_at?: Date;
  reviewed_by?: string;
  rejection_reason?: string;
  expires_at: Date;
  trace_id: string;
  created_at: Date;
  updated_at: Date;
}

export interface SubmitKYCRequest {
  seller_id: string;
  verification_type: "basic" | "enhanced" | "premium";
  personal_info: {
    first_name: string;
    last_name: string;
    date_of_birth: string;
    nationality: string;
    address: {
      street: string;
      city: string;
      state: string;
      postal_code: string;
      country: string;
    };
  };
  business_info?: {
    business_name: string;
    business_type: string;
    tax_id: string;
    business_address: {
      street: string;
      city: string;
      state: string;
      postal_code: string;
      country: string;
    };
  };
  documents: Array<{
    type: "id_card" | "passport" | "drivers_license" | "business_license" | "tax_document";
    file_url: string;
    file_name: string;
    uploaded_at: string;
  }>;
  trace_id: string;
}

export interface KYCReviewRequest {
  kyc_id: string;
  reviewer_id: string;
  decision: "approve" | "reject";
  rejection_reason?: string;
  trace_id: string;
}

export class ComplianceService {
  // aiDecisionClient is optional - can be an object with method evaluateKYC(payload) that returns { decision: 'approve'|'reject'|'manual', confidence:number }
  constructor(private pool: Pool, private aiDecisionClient?: { evaluateKYC: (payload: any) => Promise<any> }) {}

  async submitKYC(request: SubmitKYCRequest): Promise<KYCVerification> {
    const client = await this.pool.connect();

    try {
      await client.query("BEGIN");

      // Check if seller already has a pending/active KYC
      const existingKYC = await client.query(
        `
        SELECT id, status FROM kyc_verifications
        WHERE seller_id = $1 AND status IN ('pending', 'under_review', 'verified')
        ORDER BY created_at DESC
        LIMIT 1
      `,
        [request.seller_id]
      );

      if (existingKYC.rows.length > 0) {
        const status = existingKYC.rows[0].status;
        if (status === "verified") {
          throw new Error("Seller already has verified KYC");
        } else {
          throw new Error("Seller has pending KYC verification");
        }
      }

      // Calculate risk score based on provided information
      const riskScore = this.calculateRiskScore(request);

      // Set expiration (6 months from now)
      const expiresAt = new Date();
      expiresAt.setMonth(expiresAt.getMonth() + 6);

      // Create KYC verification record
      const kycId = uuidv4();
      const result = await client.query(
        `
        INSERT INTO kyc_verifications (
          id, seller_id, status, verification_type, documents, personal_info,
          business_info, risk_score, submitted_at, expires_at, trace_id,
          created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), $9, $10, NOW(), NOW())
        RETURNING *
      `,
        [
          kycId,
          request.seller_id,
          "pending",
          request.verification_type,
          JSON.stringify(request.documents),
          JSON.stringify(request.personal_info),
          request.business_info ? JSON.stringify(request.business_info) : null,
          riskScore,
          expiresAt.toISOString(),
          request.trace_id
        ]
      );

      // Update seller's KYC status
      await client.query(
        `
        UPDATE sellers
        SET kyc_status = 'pending', kyc_submitted_at = NOW(), updated_at = NOW()
        WHERE id = $1
      `,
        [request.seller_id]
      );

      await client.query("COMMIT");

      const mapped = this.mapKYCRow(result.rows[0]);

      // If an AI decision client is configured and the feature flag allows it, call it to get an automated decision
      if (this.aiDecisionClient && isFeatureEnabled('KYC_AUTO_DECISION')) {
        try {
          const decisionResp = await this.aiDecisionClient.evaluateKYC({ kyc: mapped, request });

          if (decisionResp && (decisionResp.decision === "approve" || decisionResp.decision === "reject")) {
            // perform automated review using system reviewer
            await this.reviewKYC({
              kyc_id: mapped.id,
              reviewer_id: "system-ai",
              decision: decisionResp.decision === "approve" ? "approve" : "reject",
              trace_id: request.trace_id
            } as any);
            // re-fetch latest state
            const updated = await this.getSellerKYC(request.seller_id);
            return updated as KYCVerification;
          }
        } catch (err) {
          // ignore AI decision errors to avoid blocking submission
        }
      }

      return mapped;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async reviewKYC(request: KYCReviewRequest): Promise<KYCVerification> {
    const client = await this.pool.connect();

    // Log review attempt
    try {
      await client.query(
        `INSERT INTO compliance_events (id, seller_id, event_type, details) VALUES (gen_random_uuid(), $1, $2, $3)`,
        [request.kyc_id, 'kyc_review_attempt', JSON.stringify({ reviewer: request.reviewer_id, decision: request.decision })]
      );
    } catch (e) {
      // Best-effort logging
    }


    try {
      await client.query("BEGIN");

      // Get KYC record
      const kyc = await client.query(
        `
        SELECT * FROM kyc_verifications
        WHERE id = $1 AND status = 'pending'
      `,
        [request.kyc_id]
      );

      if (kyc.rows.length === 0) {
        throw new Error("KYC verification not found or not reviewable");
      }

      const kycData = this.mapKYCRow(kyc.rows[0]);
      const newStatus = request.decision === "approve" ? "verified" : "rejected";

      // Update KYC status
      const result = await client.query(
        `
        UPDATE kyc_verifications
        SET status = $1, reviewed_at = NOW(), reviewed_by = $2,
            rejection_reason = $3, updated_at = NOW()
        WHERE id = $4
        RETURNING *
      `,
        [newStatus, request.reviewer_id, request.rejection_reason || null, request.kyc_id]
      );

      // Update seller's KYC status
      await client.query(
        `
        UPDATE sellers
        SET kyc_status = $1, kyc_verified_at = CASE WHEN $1 = 'verified' THEN NOW() ELSE NULL END,
            updated_at = NOW()
        WHERE id = $2
      `,
        [newStatus, kycData.seller_id]
      );

      await client.query("COMMIT");
      return this.mapKYCRow(result.rows[0]);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async getSellerKYC(sellerId: string): Promise<KYCVerification | null> {
    const result = await this.pool.query(
      `
      SELECT * FROM kyc_verifications
      WHERE seller_id = $1
      ORDER BY created_at DESC
      LIMIT 1
    `,
      [sellerId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapKYCRow(result.rows[0]);
  }

  async getPendingKYCReviews(limit: number = 50): Promise<KYCVerification[]> {
    const result = await this.pool.query(
      `
      SELECT * FROM kyc_verifications
      WHERE status = 'pending'
      ORDER BY submitted_at ASC
      LIMIT $1
    `,
      [limit]
    );

    return result.rows.map((row) => this.mapKYCRow(row));
  }

  async expireOldKYC(): Promise<number> {
    const result = await this.pool.query(`
      UPDATE kyc_verifications
      SET status = 'expired', updated_at = NOW()
      WHERE status IN ('pending', 'under_review') AND expires_at < NOW()
    `);

    const expired = result.rowCount || 0;

    // Log the expiration event
    try {
      await this.pool.query(
        `INSERT INTO compliance_events (id, event_type, details) VALUES (gen_random_uuid(), $1, $2)`,
        ['kyc_expire', JSON.stringify({ expired, when: new Date().toISOString() })]
      );
    } catch (e) {
      // Best-effort logging
    }

    return expired;
  }

  async getSellerComplianceStatus(sellerId: string): Promise<{
    kyc_status: string;
    risk_score: number;
    can_receive_payments: boolean;
    restrictions: string[];
  }> {
    const seller = await this.pool.query(
      `
      SELECT kyc_status, risk_score FROM sellers WHERE id = $1
    `,
      [sellerId]
    );

    if (seller.rows.length === 0) {
      throw new Error("Seller not found");
    }

    const kycStatus = seller.rows[0].kyc_status;
    const riskScore = seller.rows[0].risk_score || 0;

    // Determine if seller can receive payments
    const canReceivePayments = kycStatus === "verified" && riskScore < 70;

    // Determine restrictions based on risk score and KYC status
    const restrictions: string[] = [];
    if (kycStatus !== "verified") {
      restrictions.push("KYC not verified");
    }
    if (riskScore >= 70) {
      restrictions.push("High risk profile");
    }
    if (riskScore >= 90) {
      restrictions.push("Payment processing suspended");
    }

    return {
      kyc_status: kycStatus,
      risk_score: riskScore,
      can_receive_payments: canReceivePayments,
      restrictions
    };
  }

  async updateSellerRiskScore(sellerId: string, newScore: number, reason: string): Promise<void> {
    await this.pool.query(
      `
      UPDATE sellers
      SET risk_score = $1, risk_score_updated_at = NOW(), updated_at = NOW()
      WHERE id = $2
    `,
      [newScore, sellerId]
    );

    // Log risk score change for audit
    await this.pool.query(
      `
      INSERT INTO compliance_events (
        id, seller_id, event_type, details, created_at
      ) VALUES ($1, $2, $3, $4, NOW())
    `,
      [uuidv4(), sellerId, "risk_score_update", JSON.stringify({ new_score: newScore, reason })]
    );
  }

  private calculateRiskScore(request: SubmitKYCRequest): number {
    let score = 50; // Base score

    // Country risk (simplified)
    const highRiskCountries = ["AF", "KP", "IR", "SY", "YE"];
    if (highRiskCountries.includes(request.personal_info.nationality)) {
      score += 30;
    }

    // Business type risk
    if (request.business_info) {
      const highRiskTypes = ["cryptocurrency", "gambling", "weapons"];
      if (
        highRiskTypes.some((type) =>
          request.business_info!.business_type.toLowerCase().includes(type)
        )
      ) {
        score += 25;
      }
    }

    // Document completeness
    const requiredDocs = ["id_card"];
    const submittedDocTypes = request.documents.map((d) => d.type);
    const missingDocs = requiredDocs.filter((doc) => !submittedDocTypes.includes(doc));
    score += missingDocs.length * 10;

    // Age risk (very young or very old)
    const age =
      new Date().getFullYear() - new Date(request.personal_info.date_of_birth).getFullYear();
    if (age < 21 || age > 70) {
      score += 10;
    }

    // Ensure score is within bounds
    return Math.max(0, Math.min(100, score));
  }

  private mapKYCRow(row: any): KYCVerification {
    return {
      id: row.id,
      seller_id: row.seller_id,
      status: row.status,
      verification_type: row.verification_type,
      documents: JSON.parse(row.documents),
      personal_info: JSON.parse(row.personal_info),
      business_info: row.business_info ? JSON.parse(row.business_info) : undefined,
      risk_score: parseInt(row.risk_score),
      submitted_at: new Date(row.submitted_at),
      reviewed_at: row.reviewed_at ? new Date(row.reviewed_at) : undefined,
      reviewed_by: row.reviewed_by,
      rejection_reason: row.rejection_reason,
      expires_at: new Date(row.expires_at),
      trace_id: row.trace_id,
      created_at: new Date(row.created_at),
      updated_at: new Date(row.updated_at)
    };
  }
}
