import DPORoleGuard, { UserSession } from "../guards/role-guard";
import { dashboardMetricsHandler } from "@pulsco/admin-gateway";
import { NextRequest } from "next/server";

describe("DPO Dashboard basics", () => {
  it("gateway handler should require authorization and return metrics", async () => {
    // simulate unauthorized request
    const unauth = new NextRequest("https://test/?role=dpo");
    // no header; should return 401
    let resp = await dashboardMetricsHandler("dpo")(unauth as any);
    expect(resp.status).toBe(401);

    // authorized with header
    const auth = new NextRequest("https://test/?role=dpo");
    auth.headers.set("x-admin-role", "dpo");
    // stub internal call to avoid contacting CSI; monkeypatch handleMetricsRequest
    const gateway = require("@pulsco/admin-gateway");
    jest
      .spyOn(gateway, "handleMetricsRequest")
      .mockResolvedValue({ metrics: { privacy_score: 77 } });
    resp = await dashboardMetricsHandler("dpo")(auth as any);
    const body = await resp.json();
    expect(body.metrics.privacy_score).toBe(77);
  });

  it("DPORoleGuard.validateRole recognizes dpo role", () => {
    const guard = new DPORoleGuard({ requiredRole: "dpo" as any, marpClient: {} as any });
    // accessUser method is private; test validateRole indirectly via validateAccess mock
    const session: UserSession = {
      userId: "u1",
      role: "dpo",
      sessionId: "s1",
      pc365Token: "t",
      deviceFingerprint: "fingerprint123",
      lastActivity: new Date()
    };
    // override validation helpers to avoid network calls
    // @ts-ignore
    guard.validateSession = async () => true;
    // @ts-ignore
    guard.validateGovernanceApproval = async () => true;
    expect(guard.validateAccess(session)).resolves.toBe(true);
  });

  // service layer is now thin wrapper to admin gateway; no direct CSI tests needed
});
