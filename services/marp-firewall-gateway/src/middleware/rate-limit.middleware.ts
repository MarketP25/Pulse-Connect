import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class RateLimitMiddleware implements NestMiddleware {
  private readonly requests = new Map<string, { count: number; resetTime: number }>();

  async use(req: Request, res: Response, next: NextFunction) {
    const clientId = req.headers['x-client-id'] as string || req.ip;
    const now = Date.now();
    const windowMs = 60 * 1000; // 1 minute
    const maxRequests = 100; // requests per minute

    const clientData = this.requests.get(clientId);

    if (!clientData || now > clientData.resetTime) {
      // Reset or initialize client data
      this.requests.set(clientId, {
        count: 1,
        resetTime: now + windowMs,
      });
    } else {
      // Increment count
      clientData.count++;

      if (clientData.count > maxRequests) {
        res.status(429).json({
          error: 'Rate limit exceeded',
          retryAfter: Math.ceil((clientData.resetTime - now) / 1000),
          limit: maxRequests,
          windowMs,
        });
        return;
      }
    }

    // Add rate limit headers
    const currentData = this.requests.get(clientId)!;
    res.setHeader('X-RateLimit-Limit', maxRequests.toString());
    res.setHeader('X-RateLimit-Remaining', Math.max(0, maxRequests - currentData.count).toString());
    res.setHeader('X-RateLimit-Reset', new Date(currentData.resetTime).toISOString());

    next();
  }
}
