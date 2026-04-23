import { Injectable, NestMiddleware, UnauthorizedException } from "@nestjs/common";

@Injectable()
export class InternalSecretMiddleware implements NestMiddleware {
  use(req: any, res: any, next: () => void) {
    const secret = req.headers["x-internal-secret"];
    const expectedSecret = process.env.INTERNAL_SERVICE_SECRET;

    if (!secret || secret !== expectedSecret) {
      throw new UnauthorizedException("Invalid internal service secret");
    }
    next();
  }
}
