import { Injectable, Logger } from '@nestjs/common';
import { ExecuteRequestDto } from '../dto/execute-request.dto';
import { HashChain } from '../../../shared/lib/src/hashChain';

@Injectable()
export class SignatureVerifierService {
  private readonly logger = new Logger(SignatureVerifierService.name);
  private readonly hashChain = new HashChain();

  /**
   * Verify MARP signature on incoming request
   * Trust anchor: Only MARP-signed requests are accepted
   */
  async verifyRequest(request: ExecuteRequestDto): Promise<boolean> {
    try {
      // Extract signature from request
      const signature = request.marpSignature;
      if (!signature) {
        this.logger.warn(`No MARP signature found for request ${request.requestId}`);
        return false;
      }

      // Create canonical request data for verification
      const canonicalData = this.createCanonicalRequest(request);

      // Verify signature against MARP public key
      // In production: Use proper cryptographic verification
      const isValid = this.verifyMARPSignature(canonicalData, signature);

      if (!isValid) {
        this.logger.error(`MARP signature verification failed for request ${request.requestId}`);
        // Send anomaly report to MARP
        await this.reportSignatureAnomaly(request, signature);
      }

      return isValid;

    } catch (error) {
      this.logger.error(`Signature verification error: ${error.message}`);
      return false;
    }
  }

  /**
   * Create canonical representation of request for signature verification
   */
  private createCanonicalRequest(request: ExecuteRequestDto): string {
    // Remove signature from canonical data to prevent circular verification
    const { marpSignature, ...canonicalRequest } = request;

    // Sort keys for deterministic canonical form
    const sortedRequest = this.sortObjectKeys(canonicalRequest);

    return JSON.stringify(sortedRequest);
  }

  /**
   * Verify signature against MARP public key
   */
  private verifyMARPSignature(canonicalData: string, signature: string): boolean {
    try {
      // In production: Use crypto.verify() with MARP public key
      // For now: Simple hash comparison (placeholder)
      const expectedSignature = this.hashChain.hash(canonicalData);

      // Compare signatures (in production would use proper crypto)
      return signature === expectedSignature;

    } catch (error) {
      this.logger.error(`Signature verification failed: ${error.message}`);
      return false;
    }
  }

  /**
   * Report signature anomalies to MARP
   */
  private async reportSignatureAnomaly(request: ExecuteRequestDto, signature: string) {
    // In production: Send to MARP anomaly detection system
    this.logger.warn(`Reporting signature anomaly for request ${request.requestId}`);

    // Placeholder: Would send to MARP via secure channel
    // await this.marpClient.reportAnomaly({
    //   type: 'signature_verification_failure',
    //   requestId: request.requestId,
    //   subsystem: request.subsystem,
    //   signature: signature,
    //   timestamp: new Date().toISOString(),
    // });
  }

  /**
   * Recursively sort object keys for canonical representation
   */
  private sortObjectKeys(obj: any): any {
    if (obj === null || typeof obj !== 'object') {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.sortObjectKeys(item));
    }

    const sortedObj: any = {};
    Object.keys(obj).sort().forEach(key => {
      sortedObj[key] = this.sortObjectKeys(obj[key]);
    });

    return sortedObj;
  }
}
