"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PC365Guard = void 0;
exports.createPC365Guard = createPC365Guard;
const crypto_1 = require("crypto");
class PC365Guard {
    constructor(config) {
        this.config = config;
    }
    /**
     * Validates PC365 dual control for destructive actions
     * @param headers - Request headers containing PC365 attestation
     * @returns true if valid, throws error if invalid
     */
    validateDestructiveAction(headers) {
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
    verifyPC365Attestation(attestation) {
        if (!attestation)
            return false;
        // Simulate HMAC verification using PC365 master token
        // In production, this would verify against KMS/Vault managed token
        const expected = (0, crypto_1.createHmac)('sha256', this.config.pc365MasterToken)
            .update(`${this.config.founderEmail}:${this.config.serviceDeviceFingerprint}`)
            .digest('hex');
        return attestation === expected;
    }
    /**
     * Generates PC365 attestation for testing (DO NOT USE IN PRODUCTION)
     * @returns attestation token
     */
    generateAttestation() {
        return (0, crypto_1.createHmac)('sha256', this.config.pc365MasterToken)
            .update(`${this.config.founderEmail}:${this.config.serviceDeviceFingerprint}`)
            .digest('hex');
    }
}
exports.PC365Guard = PC365Guard;
/**
 * Factory function to create PC365 Guard from environment
 * @returns PC365Guard instance
 */
function createPC365Guard() {
    const config = {
        pc365MasterToken: process.env.PC_365_MASTER_TOKEN || '',
        founderEmail: process.env.FOUNDER_EMAIL || 'superadmin@pulsco.com',
        serviceDeviceFingerprint: process.env.SERVICE_DEVICE_FINGERPRINT || '',
    };
    if (!config.pc365MasterToken) {
        throw new Error('PC365: Master token not configured');
    }
    return new PC365Guard(config);
}
//# sourceMappingURL=pc365Guard.js.map