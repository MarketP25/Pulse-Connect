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
    authorization?: string;
    'x-pc365'?: string;
    'x-founder'?: string;
    'x-device'?: string;
}
export interface PC365Config {
    pc365MasterToken: string;
    founderEmail: string;
    serviceDeviceFingerprint: string;
}
export declare class PC365Guard {
    private config;
    constructor(config: PC365Config);
    /**
     * Validates PC365 dual control for destructive actions
     * @param headers - Request headers containing PC365 attestation
     * @returns true if valid, throws error if invalid
     */
    validateDestructiveAction(headers: PC365Headers): boolean;
    /**
     * Verifies PC365 attestation token using HMAC
     * @param attestation - The attestation token from headers
     * @returns true if valid
     */
    private verifyPC365Attestation;
    /**
     * Generates PC365 attestation for testing (DO NOT USE IN PRODUCTION)
     * @returns attestation token
     */
    generateAttestation(): string;
}
/**
 * Factory function to create PC365 Guard from environment
 * @returns PC365Guard instance
 */
export declare function createPC365Guard(): PC365Guard;
//# sourceMappingURL=pc365Guard.d.ts.map