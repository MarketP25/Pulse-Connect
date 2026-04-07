import { createServer, IncomingMessage, ServerResponse } from "node:http";
import {
  emergencyProtocolRoute,
  eventsRoute,
  intelligenceRoute,
  telemetryRoute
} from "../../../packages/admin-gateway/src/index";

type GatewayHandler = (request: Request) => Promise<Response>;

function buildAbsoluteUrl(req: IncomingMessage): string {
  const forwardedProto = req.headers["x-forwarded-proto"];
  const protocol = typeof forwardedProto === "string" ? forwardedProto : "http";
  const host = req.headers.host || `localhost:${process.env.PORT || "3001"}`;
  const path = req.url || "/";
  return `${protocol}://${host}${path}`;
}

async function readBody(req: IncomingMessage): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString("utf8");
}

function toFetchRequest(req: IncomingMessage, body: string): Request {
  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (Array.isArray(value)) {
      headers.set(key, value.join(", "));
    } else if (typeof value === "string") {
      headers.set(key, value);
    }
  }

  const method = (req.method || "GET").toUpperCase();
  const init: RequestInit = {
    method,
    headers
  };

  if (method !== "GET" && method !== "HEAD") {
    init.body = body;
  }

  return new Request(buildAbsoluteUrl(req), init);
}

function writeJson(res: ServerResponse, status: number, payload: unknown): void {
  const serialized = JSON.stringify(payload);
  res.statusCode = status;
  res.setHeader("content-type", "application/json");
  res.setHeader("cache-control", "no-store");
  res.end(serialized);
}

async function writeFetchResponse(fetchResponse: Response, res: ServerResponse): Promise<void> {
  res.statusCode = fetchResponse.status;
  fetchResponse.headers.forEach((value, key) => {
    res.setHeader(key, value);
  });

  const payload = Buffer.from(await fetchResponse.arrayBuffer());
  res.end(payload);
}

function routeFor(pathname: string, method: string): GatewayHandler | null {
  if (pathname === "/api/admin/intelligence" && method === "GET") return intelligenceRoute;
  if (pathname === "/api/admin/events" && method === "POST") return eventsRoute;
  if (pathname === "/api/admin/telemetry" && method === "GET") return telemetryRoute;
  if (pathname === "/api/admin/emergency-protocol" && (method === "GET" || method === "POST")) {
    return emergencyProtocolRoute;
  }
  return null;
}

async function handleRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
  if ((req.method || "GET").toUpperCase() === "GET" && (req.url || "") === "/health") {
    writeJson(res, 200, {
      service: "admin-gateway-service",
      status: "ok",
      timestamp: new Date().toISOString()
    });
    return;
  }

  const method = (req.method || "GET").toUpperCase();
  const parsed = new URL(buildAbsoluteUrl(req));
  const handler = routeFor(parsed.pathname, method);
  if (!handler) {
    writeJson(res, 404, {
      error: "not_found",
      message: `No route for ${method} ${parsed.pathname}`
    });
    return;
  }

  const body = await readBody(req);
  const fetchRequest = toFetchRequest(req, body);

  try {
    const fetchResponse = await handler(fetchRequest);
    await writeFetchResponse(fetchResponse, res);
  } catch (error) {
    console.error("[admin-gateway-service] request forwarding failed", error);
    writeJson(res, 500, {
      error: "gateway_forwarding_failed",
      message: error instanceof Error ? error.message : "Unknown error"
    });
  }
}

async function bootstrap() {
  const port = Number(process.env.PORT || 3001);
  const server = createServer((req, res) => {
    void handleRequest(req, res);
  });

  server.listen(port, () => {
    console.log(`[admin-gateway-service] listening on port ${port}`);
  });
}

void bootstrap();
