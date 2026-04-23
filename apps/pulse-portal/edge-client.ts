import { MarpCrypto } from "./marp-crypto";

export interface EdgeRequest {
  subsystem: string;
  action: string;
  payload: any;
  userId: string;
}

/**
 * Client for interacting with pulse-connect-core.
 * Automatically signs requests with non-extractable device keys.
 */
export class EdgeClient {
  private static readonly GATEWAY_URL = process.env.NEXT_PUBLIC_EDGE_GATEWAY_API;

  static async execute(req: EdgeRequest) {
    const body = JSON.stringify({
      ...req,
      timestamp: new Date().toISOString()
    });

    // Generate cryptographic signature via Web Crypto (non-extractable)
    const signature = await MarpCrypto.signPayload(body);

    const response = await fetch(`${this.GATEWAY_URL}/edge/execute`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-MARP-Signature": signature,
        "X-MARP-Key-Version": "v1",
        "X-MARP-User-ID": req.userId
      },
      body
    });

    if (!response.ok) throw new Error(`MARP Execution Failed: ${response.statusText}`);
    return response.json();
  }
}
