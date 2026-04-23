import { Injectable, NestMiddleware, UnauthorizedException, Logger, Inject } from "@nestjs/common";
import * as crypto from "crypto";
import { DeviceKeyService } from "../services/device-key.service";

@Injectable()
export class MarpAuthMiddleware implements NestMiddleware {
  private readonly logger = new Logger("MARP-Signer");

  constructor(private readonly keyService: DeviceKeyService) {}

  async use(req: any, res: any, next: () => void) {
    const signature = req.headers["x-marp-signature"];
    const keyVersion = req.headers["x-marp-key-version"] || "v1";
    const userId = req.headers["x-marp-user-id"];

    if (!signature) {
      this.logger.error("Access denied: Missing X-MARP-Signature header");
      throw new UnauthorizedException("MARP Signature Required");
    }

    // Implementation: Load user-specific public key registered during KYC
    let publicKey = await this.keyService.getKeyForUser(userId);

    // Fallback to global Council key if system-level action
    if (!publicKey) {
      publicKey = process.env.MARP_PUBLIC_KEY;
    }

    if (!publicKey) {
      throw new UnauthorizedException("No valid governance key found for actor");
    }

    try {
      const verifier = crypto.createVerify("RSA-SHA256");
      // Verify against the raw body preserved in main.ts
      verifier.update(req.rawBody || JSON.stringify(req.body));

      const isValid = verifier.verify(publicKey, signature, "base64");

      if (!isValid) {
        throw new Error("Invalid signature hash");
      }
      next();
    } catch (error) {
      this.logger.error(`Signature verification failed: ${error.message}`);
      throw new UnauthorizedException("Invalid MARP Governance Signature");
    }
  }
}
