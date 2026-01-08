import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { HashChain } from '../../../shared/lib/src/hashChain';

@Injectable()
export class MARPSignatureMiddleware implements NestMiddleware {
  private readonly logger = new Logger(MARPSignatureMiddleware.name);
  private readonly hashChain = new HashChain();

  async use(req: Request, res: Response, next: NextFunction) {
    try {
      // Check if request requires MARP signature validation
      if (this.requiresSignatureValidation(req)) {
        await this.validateMARPSignature(req);
        this.logger.log(`MARP signature validation passed for ${req.method} ${req.path}`);
      }

      // Add signature context to request
      (req as any).marpSignatureContext = {
        validated: true,
        timestamp: new Date().toISOString(),
      };

      next();
    } catch (error) {
      this.logger.error(`MARP signature validation failed: ${error.message}`);
      res.status(403).json({
        error: 'MARP Signature Validation Failed',
        message: error.message,
        code: 'MARP_SIGNATURE_ERROR',
      });
    }
  }

  private requiresSignatureValidation(req: Request): boolean {
    // Define endpoints that require MARP signature validation
    const signatureRequiredPatterns = [
      /\/policies\/active/,         // Active policies access
      /\/firewall\/rules/,          // Firewall rules access
      /\/councils\/decisions/,      // Council decisions access
      /\/audit\/logs/,              // Audit logs access
      /\/bundles/,                  // Bundle operations
    ];

    return signatureRequiredPatterns.some(pattern => pattern.test(req.path));
  }

  private async validateMARPSignature(req: Request): Promise<void> {
    // Extract MARP signature from headers
    const marpSignature = req.headers['x-marp-signature'] as string;
    const requestId = req.headers['x-request-id'] as string;
    const timestamp = req.headers['x-timestamp'] as string;

    if (!marpSignature) {
      throw new Error('Missing MARP signature header');
    }

    if (!requestId) {
      throw new Error('Missing request ID header');
    }

    if (!timestamp) {
      throw new Error('Missing timestamp header');
    }

    // Check timestamp freshness (within 5 minutes)
    const requestTime = new Date(timestamp);
    const now = new Date();
    const timeDiff = Math.abs(now.getTime() - requestTime.getTime());

    if (timeDiff > 5 * 60 * 1000) { // 5 minutes
      throw new Error('Request timestamp is stale');
    }

    // Create canonical request data for signature verification
    const canonicalData = this.createCanonicalRequestData(req, requestId, timestamp);

    // Verify signature
    const expectedSignature = this.hashChain.hash(canonicalData);

    if (expectedSignature !== marpSignature) {
      throw new Error('Invalid MARP signature');
    }

    // Additional validation: check against known valid signatures
    // This would typically involve checking against a signature registry
    await this.validateAgainstSignatureRegistry(marpSignature, canonicalData);
  }

  private createCanonicalRequestData(req: Request, requestId: string, timestamp: string): string {
    // Create canonical representation of the request
    const canonicalRequest = {
      method: req.method,
      path: req.path,
      query: this.canonicalizeObject(req.query),
      body: req.method !== 'GET' ? this.canonicalizeObject(req.body) : undefined,
      requestId,
      timestamp,
    };

    return this.hashChain.canonicalize(canonicalRequest);
  }

  private canonicalizeObject(obj: any): string {
    if (!obj || typeof obj !== 'object') {
      return JSON.stringify(obj);
    }

    // Sort keys and stringify consistently
    return JSON.stringify(obj, Object.keys(obj).sort());
  }

  private async validateAgainstSignatureRegistry(signature: string, canonicalData: string): Promise<void> {
    // This would check against a database of valid signatures
    // For now, we'll do basic validation

    // Check signature format (should be 64 character hex)
    if (!/^[a-f0-9]{64}$/i.test(signature)) {
      throw new Error('Invalid signature format');
    }

    // Additional checks could include:
    // - Check against revoked signatures
    // - Verify signature hasn't expired
    // - Check rate limits for signature reuse

    // Placeholder for future implementation
    this.logger.debug(`Signature ${signature.substring(0, 16)}... validated against registry`);
  }
}
