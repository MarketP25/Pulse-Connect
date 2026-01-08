import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { PC365Guard } from '../../../shared/lib/src/pc365Guard';

@Injectable()
export class PC365Middleware implements NestMiddleware {
  constructor(private readonly pc365Guard: PC365Guard) {}

  async use(req: Request, res: Response, next: NextFunction) {
    try {
      // Extract PC365 attestation from headers
      const pc365Attestation = req.headers['x-pc365-attestation'] as string;
      const founderEmail = req.headers['x-founder-email'] as string;
      const deviceFingerprint = req.headers['x-device-fingerprint'] as string;

      if (pc365Attestation) {
        await this.pc365Guard.validateDestructiveAction({
          pc365Attestation,
          founderEmail,
          deviceFingerprint,
        });
      }

      next();
    } catch (error) {
      res.status(403).json({
        error: 'PC365 Validation Failed',
        message: error.message,
      });
    }
  }
}
