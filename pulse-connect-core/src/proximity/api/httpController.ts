import { Request, Response } from 'express';
import { ProximityService } from '../service';
import { RateLimiter } from '../service/utils';
import { ProximityRequestSchema, ProximityRequest } from './schemas';
import { ZodError } from 'zod';

export class ProximityController {
  private service: ProximityService;
  private rateLimiter: RateLimiter;

  constructor(service: ProximityService) {
    this.service = service;
    // Initialize rate limiter from environment variables with a default
    this.rateLimiter = new RateLimiter(
      parseInt(process.env.RATE_LIMIT_RPS || '50'),
      60 * 1000 // 1-minute window
    );
  }

  /**
   * Forward geocoding endpoint
   */
  async geocode(req: Request, res: Response): Promise<void> {
    try {
      const proximityReq: ProximityRequest = ProximityRequestSchema.parse({
        actorId: req.headers['x-actor-id'],
        subsystem: req.headers['x-subsystem'],
        purpose: req.body.purpose,
        requestId: req.headers['x-request-id'],
        policyVersion: req.headers['x-policy-version'],
        reasonCode: req.body.reasonCode,
        data: req.body,
      });

      // Per-actor rate limiting
      if (!this.rateLimiter.isAllowed(proximityReq.actorId)) {
        res.status(429).json({
          error: 'Rate limit exceeded',
          retryAfter: 60
        });
        return;
      }

      const result = await this.service.forwardGeocode(
        proximityReq.data.address,
        proximityReq.data.countryCode,
        proximityReq
      );

      res.json({
        success: true,
        data: result,
        requestId: proximityReq.requestId,
        // @ts-ignore - _cache is a dynamic property for observability
        cache: result._cache,
      });
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({ error: 'Invalid request payload', details: error.errors });
        return;
      }
      // Proper error logging will be integrated with the AuditEngine
      console.error(`[${req.headers['x-request-id']}] Geocode error:`, error);
      res.status(500).json({
        error: 'Geocoding failed',
        message: error instanceof Error ? error.message : 'An unknown error occurred',
      });
    }
  }

  /**
   * Reverse geocoding endpoint
   */
  async reverseGeocode(req: Request, res: Response): Promise<void> {
    try {
      const proximityReq: ProximityRequest = ProximityRequestSchema.parse({
        actorId: req.headers['x-actor-id'],
        subsystem: req.headers['x-subsystem'],
        purpose: req.body.purpose,
        requestId: req.headers['x-request-id'],
        policyVersion: req.headers['x-policy-version'],
        reasonCode: req.body.reasonCode,
        data: req.body,
      });

      // Per-actor rate limiting
      if (!this.rateLimiter.isAllowed(proximityReq.actorId)) {
        res.status(429).json({
          error: 'Rate limit exceeded',
          retryAfter: 60
        });
        return;
      }

      const result = await this.service.reverseGeocode(
        proximityReq.data.lat,
        proximityReq.data.lng,
        proximityReq
      );

      res.json({
        success: true,
        data: result,
        requestId: proximityReq.requestId,
        // @ts-ignore
        cache: result._cache,
      });
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({ error: 'Invalid request payload', details: error.errors });
        return;
      }
      console.error(`[${req.headers['x-request-id']}] Reverse geocode error:`, error);
      res.status(500).json({
        error: 'Reverse geocoding failed',
        message: error instanceof Error ? error.message : 'An unknown error occurred',
      });
    }
  }

  /**
   * Distance calculation endpoint
   */
  async distance(req: Request, res: Response): Promise<void> {
    try {
      const proximityReq: ProximityRequest = ProximityRequestSchema.parse({
        actorId: req.headers['x-actor-id'],
        subsystem: req.headers['x-subsystem'],
        purpose: req.body.purpose,
        requestId: req.headers['x-request-id'],
        policyVersion: req.headers['x-policy-version'],
        reasonCode: req.body.reasonCode,
        data: req.body,
      });

      const result = await this.service.distance(
        proximityReq.data.origin,
        proximityReq.data.destination,
        proximityReq
      );

      res.json({
        success: true,
        data: { distanceKm: result },
        requestId: proximityReq.requestId
      });
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({ error: 'Invalid request payload', details: error.errors });
        return;
      }
      console.error(`[${req.headers['x-request-id']}] Distance calculation error:`, error);
      res.status(500).json({
        error: 'Distance calculation failed',
        message: error instanceof Error ? error.message : 'An unknown error occurred',
      });
    }
  }

  /**
   * Clustering endpoint
   */
  async cluster(req: Request, res: Response): Promise<void> {
    try {
      const proximityReq: ProximityRequest = ProximityRequestSchema.parse({
        actorId: req.headers['x-actor-id'],
        subsystem: req.headers['x-subsystem'],
        purpose: req.body.purpose,
        requestId: req.headers['x-request-id'],
        policyVersion: req.headers['x-policy-version'],
        reasonCode: req.body.reasonCode,
        data: req.body,
      });

      const result = await this.service.cluster(
        proximityReq.data.locations,
        proximityReq.data.options,
        proximityReq
      );

      res.json({
        success: true,
        data: result,
        requestId: proximityReq.requestId
      });
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({ error: 'Invalid request payload', details: error.errors });
        return;
      }
      console.error(`[${req.headers['x-request-id']}] Clustering error:`, error);
      res.status(500).json({
        error: 'Clustering failed',
        message: error instanceof Error ? error.message : 'An unknown error occurred',
      });
    }
  }

  /**
   * Health check endpoint
   */
  async health(req: Request, res: Response): Promise<void> {
    try {
      const health = await this.service.getHealth();
      res.status(health.healthy ? 200 : 503).json({
        status: health.healthy ? 'healthy' : 'unhealthy',
        ...health
      });
    } catch (error) {
      res.status(500).json({
        status: 'unhealthy',
        message: error.message
      });
    }
  }

  /**
   * Metrics endpoint
   */
  async metrics(req: Request, res: Response): Promise<void> {
    try {
      const metrics = await this.service.getMetrics();
      res.setHeader('Content-Type', 'text/plain; version=0.0.4');
      res.send(metrics);
    } catch (error) {
      res.status(500).json({ error: 'Failed to retrieve metrics', message: error.message });
    }
  }
}
