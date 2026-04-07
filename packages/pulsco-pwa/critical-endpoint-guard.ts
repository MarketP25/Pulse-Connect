import type { NextApiRequest, NextApiResponse } from "next";

export type CriticalActionGuardInput = {
  endpoint: string;
  action: string;
};

const REASON_CODE = "CSI_GATEWAY_ACCESS";

function isLocalCriticalApisAllowed() {
  return (
    process.env.NODE_ENV !== "production" || process.env.PULSCO_ALLOW_LOCAL_CRITICAL_APIS === "true"
  );
}

function disabledPayload(input: CriticalActionGuardInput) {
  return {
    error: "LOCAL_CRITICAL_ENDPOINT_DISABLED",
    reason_code: REASON_CODE,
    message:
      "This local critical endpoint is disabled in production. Use Edge Gateway /edge/execute.",
    edge_execute_path: "/edge/execute",
    endpoint: input.endpoint,
    action: input.action
  };
}

export function assertCriticalActionAllowed(input: CriticalActionGuardInput): Response | null {
  if (isLocalCriticalApisAllowed()) return null;

  return new Response(JSON.stringify(disabledPayload(input)), {
    status: 410,
    headers: {
      "content-type": "application/json",
      "cache-control": "no-store"
    }
  });
}

export function assertCriticalActionAllowedApi(
  req: NextApiRequest,
  res: NextApiResponse,
  input: CriticalActionGuardInput
) {
  if (isLocalCriticalApisAllowed()) return true;

  void req;
  res.setHeader("cache-control", "no-store");
  res.status(410).json(disabledPayload(input));
  return false;
}
