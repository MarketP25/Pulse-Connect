import { DeliveryDecision, DeliveryRequest } from "./types";

export interface GSOInfraBridgeOptions {
  routeEndpoint: string;
  internalToken?: string;
  timeoutMs?: number;
  maxParallelism?: number;
}

export interface GSOInfraResolution {
  request: DeliveryRequest;
  decision: DeliveryDecision;
  source: "infra";
}

function cleanString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function toDecision(value: unknown): DeliveryDecision | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const row = value as Record<string, unknown>;
  const edgeNodeId = cleanString(row.edgeNodeId);
  const region = cleanString(row.region);
  const language = cleanString(row.language);
  const localizedPath = cleanString(row.localizedPath);
  const cacheKey = cleanString(row.cacheKey);

  if (!edgeNodeId || !region || !language || !localizedPath || !cacheKey) {
    return null;
  }

  return {
    edgeNodeId,
    region,
    language,
    localizedPath,
    cacheKey
  };
}

function parseDecisionPayload(payload: unknown): DeliveryDecision | null {
  const direct = toDecision(payload);
  if (direct) {
    return direct;
  }

  if (!payload || typeof payload !== "object") {
    return null;
  }

  const row = payload as Record<string, unknown>;
  return toDecision(row.decision ?? row.route ?? row.data);
}

export class GSOInfraBridge {
  private readonly routeEndpoint: string;
  private readonly internalToken?: string;
  private readonly timeoutMs: number;
  private readonly maxParallelism: number;

  constructor(options: GSOInfraBridgeOptions) {
    this.routeEndpoint = options.routeEndpoint;
    this.internalToken = options.internalToken;
    this.timeoutMs = Math.max(500, options.timeoutMs ?? 2500);
    this.maxParallelism = Math.max(1, Math.min(20, options.maxParallelism ?? 5));
  }

  async resolve(request: DeliveryRequest): Promise<DeliveryDecision | null> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const headers: Record<string, string> = {
        "content-type": "application/json",
        accept: "application/json"
      };

      if (this.internalToken) {
        headers.authorization = `Bearer ${this.internalToken}`;
        headers["x-internal-service-token"] = this.internalToken;
      }

      const response = await fetch(this.routeEndpoint, {
        method: "POST",
        headers,
        body: JSON.stringify({
          request,
          country: request.country,
          path: request.path,
          acceptedLanguages: request.acceptedLanguages
        }),
        signal: controller.signal,
        cache: "no-store"
      });

      if (!response.ok) {
        return null;
      }

      const payload = (await response.json()) as unknown;
      return parseDecisionPayload(payload);
    } catch {
      return null;
    } finally {
      clearTimeout(timer);
    }
  }

  async resolveBatch(requests: DeliveryRequest[]): Promise<GSOInfraResolution[]> {
    if (requests.length === 0) {
      return [];
    }

    const results: GSOInfraResolution[] = [];
    let cursor = 0;
    const workerCount = Math.min(this.maxParallelism, requests.length);

    const workers = Array.from({ length: workerCount }, async () => {
      while (true) {
        const current = cursor;
        cursor += 1;
        if (current >= requests.length) {
          return;
        }

        const request = requests[current];
        const decision = await this.resolve(request);
        if (decision) {
          results.push({
            request,
            decision,
            source: "infra"
          });
        }
      }
    });

    await Promise.all(workers);
    return results;
  }
}
