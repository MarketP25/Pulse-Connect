import { Request, Response, NextFunction } from "express";

export function requireInternalToken(expectedToken?: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!expectedToken) {
      if (process.env.NODE_ENV === "production") {
        res.status(500).json({
          error: "INTERNAL_TOKEN_NOT_CONFIGURED",
          message: "INTERNAL_SERVICE_TOKEN must be configured in production."
        });
        return;
      }

      next();
      return;
    }

    const providedHeader = req.header("x-internal-service-token");
    const authorization = req.header("authorization") || "";
    const bearerToken = authorization.startsWith("Bearer ")
      ? authorization.slice("Bearer ".length)
      : undefined;

    if (providedHeader === expectedToken || bearerToken === expectedToken) {
      next();
      return;
    }

    res.status(401).json({
      error: "UNAUTHORIZED",
      message: "Valid internal service token is required."
    });
  };
}
