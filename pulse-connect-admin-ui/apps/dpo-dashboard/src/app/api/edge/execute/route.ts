import { edgeExecuteOptions, proxyEdgeExecute } from "@pulsco/pwa/edge-execute-route";

// Proxies critical actions to /edge/execute with reason_code=CSI_GATEWAY_ACCESS.
const APP_ID = "@pulsco/dpo-dashboard";

export async function OPTIONS() {
  return edgeExecuteOptions();
}

export async function POST(request: Request) {
  return proxyEdgeExecute(request, APP_ID);
}
