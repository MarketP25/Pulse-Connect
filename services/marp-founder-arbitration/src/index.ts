import { Injectable, Logger } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { Pool } from 'pg';
import { PC365Guard } from '../../../shared/lib/src/pc365Guard';
import { HashChain } from '../../../shared/lib/src/hashChain';
import {
  RequestArbitrationDto,
  FounderApprovalDto,
  ArbitrationStatusDto,
  DeviceFingerprintDto,
  ArbitrationStatus,
  ArbitrationType
} from '../dto/arbitration.dto';

@Injectable()
export class FounderApprovalService {
  private readonly logger = new Logger(FounderApprovalService.name);
  private readonly hashChain = new HashChain();

  constructor(
    @Inject('DATABASE_CONNECTION') private readonly db: Pool,
    private readonly pc365Guard: PC365Guard,
  ) {}

  async requestArbitration(dto: RequestArbitrationDto, requesterId: string): Promise<ArbitrationStatusDto> {
    try {
      // Validate PC365 attestation if provided
      if (dto.pc365Attestation) {
        await this.pc365Guard.validateDestructiveAction(dto.pc365Attestation);
      }

      // Validate device fingerprint if provided
      if (dto.deviceFingerprint) {
        await this.validateDeviceFingerprint(dto.deviceFingerprint, requesterId);
      }

      const arbitrationId = this.generateArbitrationId();
      const expiresAt = new Date(Date.now() + (dto.approvalTimeoutMinutes || 60) * 60 * 1000);

      const query = `
        INSERT INTO founder_arbitrations (
          id, arbitration_type, status, request_reason, request_data,
          subsystem_name, requested_by, requested_at, expires_at,
          pc365_attestation, device_fingerprint
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *
      `;

      const values = [
        arbitrationId,
        dto.arbitrationType,
        ArbitrationStatus.PENDING,
        dto.requestReason,
        JSON.stringify(dto.requestData),
        dto.subsystemName,
        requesterId,
        new Date(),
        expiresAt,
        dto.pc365Attestation ? JSON.stringify(dto.pc365Attestation) : null,
        dto.deviceFingerprint
      ];

      const result = await this.db.query(query, values);
      const arbitration = result.rows[0];

      // Log arbitration request
      await this.logArbitrationEvent(arbitrationId, 'REQUESTED', {
        type: dto.arbitrationType,
        requester: requesterId,
        reason: dto.requestReason
      });

      return this.mapToArbitrationStatusDto(arbitration);
    } catch (error) {
      this.logger.error(`Failed to request arbitration: ${error.message}`);
      throw error;
    }
  }

  async approveArbitration(dto: FounderApprovalDto, approverId: string): Promise<ArbitrationStatusDto> {
    try {
      // Validate founder authority
      await this.validateFounderAuthority(approverId);

      // Validate device fingerprint
      if (dto.deviceFingerprint) {
        await this.validateDeviceFingerprint(dto.deviceFingerprint, approverId);
      }

      const query = `
        UPDATE founder_arbitrations
        SET status = $1, approved_by = $2, approved_at = $3, approval_notes = $4
        WHERE id = $5 AND status = $6 AND expires_at > NOW()
        RETURNING *
      `;

      const values = [
        dto.approved ? ArbitrationStatus.APPROVED : ArbitrationStatus.REJECTED,
        approverId,
        new Date(),
        dto.approvalNotes,
        dto.arbitrationId,
        ArbitrationStatus.PENDING
      ];

      const result = await this.db.query(query, values);

      if (result.rows.length === 0) {
        throw new Error('Arbitration not found or expired');
      }

      const arbitration = result.rows[0];

      // Log approval decision
      await this.logArbitrationEvent(dto.arbitrationId, dto.approved ? 'APPROVED' : 'REJECTED', {
        approver: approverId,
        notes: dto.approvalNotes
      });

      // If approved, generate approval token
      if (dto.approved) {
        await this.generateApprovalToken(dto.arbitrationId, approverId);
      }

      return this.mapToArbitrationStatusDto(arbitration);
    } catch (error) {
      this.logger.error(`Failed to approve arbitration: ${error.message}`);
      throw error;
    }
  }

  async getArbitrationStatus(arbitrationId: string): Promise<ArbitrationStatusDto> {
    const query = `SELECT * FROM founder_arbitrations WHERE id = $1`;
    const result = await this.db.query(query, [arbitrationId]);

    if (result.rows.length === 0) {
      throw new Error('Arbitration not found');
    }

    return this.mapToArbitrationStatusDto(result.rows[0]);
  }

  async validateDeviceFingerprint(fingerprint: string, userId: string): Promise<boolean> {
    const query = `
      SELECT * FROM device_fingerprints
      WHERE fingerprint = $1 AND user_id = $2 AND is_trusted = true
      AND last_verified_at > NOW() - INTERVAL '30 days'
    `;

    const result = await this.db.query(query, [fingerprint, userId]);
    return result.rows.length > 0;
  }

  async registerDeviceFingerprint(dto: DeviceFingerprintDto, userId: string): Promise<void> {
    const query = `
      INSERT INTO device_fingerprints (
        device_id, fingerprint, user_id, user_agent, ip_address,
        location, last_verified_at, is_trusted
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (fingerprint, user_id)
      DO UPDATE SET
        last_verified_at = EXCLUDED.last_verified_at,
        is_trusted = EXCLUDED.is_trusted
    `;

    await this.db.query(query, [
      dto.deviceId,
      dto.fingerprint,
      userId,
      dto.userAgent,
      dto.ipAddress,
      dto.location ? JSON.stringify(dto.location) : null,
      new Date(),
      dto.isTrusted ?? false
    ]);
  }

  private async validateFounderAuthority(userId: string): Promise<void> {
    // Check if user is founder (superadmin@pulsco.com)
    const query = `SELECT email FROM users WHERE id = $1 AND email = $2`;
    const result = await this.db.query(query, [userId, 'superadmin@pulsco.com']);

    if (result.rows.length === 0) {
      throw new Error('Unauthorized: Founder authority required');
    }
  }

  private async generateApprovalToken(arbitrationId: string, approverId: string): Promise<string> {
    const tokenData = {
      arbitrationId,
      approverId,
      issuedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours
    };

    const token = this.hashChain.hash(JSON.stringify(tokenData));

    const query = `
      UPDATE founder_arbitrations
      SET approval_token = $1, approval_token_expires_at = $2
      WHERE id = $3
    `;

    await this.db.query(query, [token, tokenData.expiresAt, arbitrationId]);
    return token;
  }

  private async logArbitrationEvent(arbitrationId: string, eventType: string, eventData: any): Promise<void> {
    const query = `
      INSERT INTO arbitration_audit_log (arbitration_id, event_type, event_data, created_at)
      VALUES ($1, $2, $3, $4)
    `;

    await this.db.query(query, [arbitrationId, eventType, JSON.stringify(eventData), new Date()]);
  }

  private generateArbitrationId(): string {
    return `arb_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private mapToArbitrationStatusDto(row: any): ArbitrationStatusDto {
    return {
      id: row.id,
      status: row.status,
      arbitrationType: row.arbitration_type,
      requestReason: row.request_reason,
      requestData: row.request_data,
      subsystemName: row.subsystem_name,
      requestedBy: row.requested_by,
      requestedAt: row.requested_at.toISOString(),
      approvedBy: row.approved_by,
      approvedAt: row.approved_at?.toISOString(),
      approvalNotes: row.approval_notes,
      expiresAt: row.expires_at?.toISOString(),
      auditTrail: row.audit_trail
    };
  }
}
