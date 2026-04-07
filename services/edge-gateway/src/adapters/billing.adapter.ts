import { Injectable, Logger } from "@nestjs/common";
import { AdapterContext, AdapterResult, SubsystemAdapter } from "./subsystem-adapter.interface";
import { ExecuteRequestDto } from "../dto/execute-request.dto";

@Injectable()
export class BillingAdapter implements SubsystemAdapter {
  private readonly logger = new Logger(BillingAdapter.name);
  readonly subsystemType = "billing";

  async execute(request: ExecuteRequestDto, context: AdapterContext): Promise<AdapterResult> {
    const action = String(request.action || "").toLowerCase();
    const amount = Number(request.context?.amount || 0);
    const region = request.regionCode || context.regionCode || "GLOBAL";

    this.logger.log(`Billing adapter executing action=${action} requestId=${request.requestId}`);

    if (!action) {
      return {
        success: false,
        error: "billing_action_required",
        riskFactors: ["invalid_input"]
      };
    }

    const blockedByPolicy = Array.isArray(context.policy?.content?.rules)
      ? (context.policy?.content?.rules as Array<Record<string, unknown>>).some((rule) => {
          const blockedAction = String(rule["blockedAction"] || "").toLowerCase();
          return blockedAction && blockedAction === action;
        })
      : false;

    if (blockedByPolicy) {
      return {
        success: false,
        error: `Billing action ${action} blocked by active policy`,
        riskFactors: ["policy_block"],
        metadata: {
          adapter: "billing",
          action,
          region
        }
      };
    }

    const riskFactors: string[] = [];
    if (amount > 10_000) {
      riskFactors.push("high_amount");
    }

    return {
      success: true,
      data: {
        status: "accepted",
        action,
        amount,
        region,
        processedAt: new Date().toISOString()
      },
      riskFactors,
      metadata: {
        adapter: "billing",
        action,
        region
      }
    };
  }
}
