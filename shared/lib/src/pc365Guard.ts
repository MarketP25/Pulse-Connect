import { createHmac } from 'crypto';

/**
 * PC365 Guard - Dual Control Security for Destructive Actions
 *
 * Implements dual control for destructive actions in the Central Super Intelligence Centre.
 * Validates founder identity, device fingerprint, and PC365 master token attestation.
 *
 * PC365 Master Token must be read from env (managed by KMS/Vault), never hard-coded.
 * Rotation at least quarterly.
 */

export interface PC365Headers {
  authorization?: string; // Service token
  'x-pc365'?: string; // Attestation token
  'x-founder'?: string; // Founder email
  'x-device'?: string; // Device fingerprint
}

export interface PC365Config {
  pc365MasterToken: string;
  founderEmail: string;
  serviceDeviceFingerprint: string;
}

export class PC365Guard {
  private config: PC365Config;

  constructor(config: PC365Config) {
    this.config = config;
  }

  /**
   * Validates PC365 dual control for destructive actions
   * @param headers - Request headers containing PC365 attestation
   * @returns true if valid, throws error if invalid
   */
  validateDestructiveAction(headers: PC365Headers): boolean {
    // Validate founder email
    if (headers['x-founder'] !== this.config.founderEmail) {
      throw new Error('PC365: Invalid founder identity');
    }

    // Validate device fingerprint
    if (headers['x-device'] !== this.config.serviceDeviceFingerprint) {
      throw new Error('PC365: Invalid device fingerprint');
    }

    // Validate PC365 attestation (HMAC verification)
    if (!this.verifyPC365Attestation(headers['x-pc365'] || '')) {
      throw new Error('PC365: Invalid attestation token');
    }

    return true;
  }

  /**
   * Verifies PC365 attestation token using HMAC
   * @param attestation - The attestation token from headers
   * @returns true if valid
   */
  private verifyPC365Attestation(attestation: string): boolean {
    if (!attestation) return false;

    // Simulate HMAC verification using PC365 master token
    // In production, this would verify against KMS/Vault managed token
    const expected = createHmac('sha256', this.config.pc365MasterToken)
      .update(`${this.config.founderEmail}:${this.config.serviceDeviceFingerprint}`)
      .digest('hex');

    return attestation === expected;
  }

  /**
   * Generates PC365 attestation for testing (DO NOT USE IN PRODUCTION)
   * @returns attestation token
   */
  generateAttestation(): string {
    return createHmac('sha256', this.config.pc365MasterToken)
      .update(`${this.config.founderEmail}:${this.config.serviceDeviceFingerprint}`)
      .digest('hex');
  }
}

/**
 * Factory function to create PC365 Guard from environment
 * @returns PC365Guard instance
 */
export function createPC365Guard(): PC365Guard {
  const config: PC365Config = {
    pc365MasterToken: process.env.PC_365_MASTER_TOKEN || '',
    founderEmail: process.env.FOUNDER_EMAIL || 'superadmin@pulsco.com',
    serviceDeviceFingerprint: process.env.SERVICE_DEVICE_FINGERPRINT || '',
  };

  if (!config.pc365MasterToken) {
    throw new Error('PC365: Master token not configured');
  }

  return new PC365Guard(config);
}
