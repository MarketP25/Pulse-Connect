import { Injectable, Logger } from "@nestjs/common";
import { ClientKafka } from "@nestjs/microservices";
import { EdgeTelemetryService } from "../services/telemetry.service";
import { AiRuleInterpreter } from "@/shared/lib/src/ai-rule-interpreter";

export interface PaymentsRequest {
  paymentId: string;
  userId: string;
  amount: number;
  currency: string;
  method: string;
  action: "charge" | "refund" | "transfer" | "verify";
  context?: {
    description?: string;
    recipientId?: string;
    fxRate?: number;
  };
}

export interface PaymentsResponse {
  paymentId: string;
  allowed: boolean;
  blockedReason?: string;
  paymentData?: {
    status: string;
    transactionId: string;
    processedAt: string;
  };
  complianceFlags: string[];
  processingTime: number;
}

@Injectable()
export class PaymentsAdapter {
  private readonly logger = new Logger(PaymentsAdapter.name);

  constructor(
    private readonly kafkaClient: ClientKafka,
    private readonly telemetryService: EdgeTelemetryService,
    private readonly aiRuleInterpreter: AiRuleInterpreter
  ) {}

  /**
   * Process payments request through Edge governance
   */
  async processPaymentsRequest(request: PaymentsRequest): Promise<PaymentsResponse> {
    const startTime = Date.now();

    try {
      // 1. Validate payment method and amount
      const methodCheck = await this.validatePaymentMethod(request);
      if (!methodCheck.allowed) {
        await this.telemetryService.recordEvent("payments_blocked", {
          paymentId: request.paymentId,
          userId: request.userId,
          action: request.action,
          reason: methodCheck.blockedReason,
          amount: request.amount,
          currency: request.currency
        });
        return {
          paymentId: request.paymentId,
          allowed: false,
          blockedReason: methodCheck.blockedReason,
          complianceFlags: methodCheck.flags,
          processingTime: Date.now() - startTime
        };
      }

      // 2. Check fraud and compliance
      const fraudCheck = await this.performPaymentFraudCheck(request);
      if (!fraudCheck.allowed) {
        return {
          paymentId: request.paymentId,
          allowed: false,
          blockedReason: fraudCheck.blockedReason,
          complianceFlags: fraudCheck.flags,
          processingTime: Date.now() - startTime
        };
      }

      // 3. Validate currency and FX rates
      const fxCheck = await this.validateFxCompliance(request);
      if (!fxCheck.allowed) {
        return {
          paymentId: request.paymentId,
          allowed: false,
          blockedReason: fxCheck.blockedReason,
          complianceFlags: fxCheck.flags,
          processingTime: Date.now() - startTime
        };
      }

      // 4. Execute payment operation
      const result = await this.executePaymentOperation(request);

      // 5. Record telemetry
      await this.telemetryService.recordEvent("payments_operation", {
        paymentId: request.paymentId,
        userId: request.userId,
        action: request.action,
        amount: request.amount,
        currency: request.currency,
        allowed: true,
        complianceFlags: [...methodCheck.flags, ...fraudCheck.flags, ...fxCheck.flags].length,
        processingTime: Date.now() - startTime
      });

      return {
        paymentId: request.paymentId,
        allowed: true,
        paymentData: result.paymentData,
        complianceFlags: [...methodCheck.flags, ...fraudCheck.flags, ...fxCheck.flags],
        processingTime: Date.now() - startTime
      };
    } catch (error) {
      this.logger.error(`Payments processing failed: ${error.message}`, error.stack);
      await this.telemetryService.recordEvent("payments_error", {
        paymentId: request.paymentId,
        userId: request.userId,
        action: request.action,
        error: error.message,
        processingTime: Date.now() - startTime
      });

      return {
        paymentId: request.paymentId,
        allowed: false,
        blockedReason: "System error during payment processing",
        complianceFlags: ["error"],
        processingTime: Date.now() - startTime
      };
    }
  }

  /**
   * Validate payment method
   */
  private async validatePaymentMethod(request: PaymentsRequest): Promise<{
    allowed: boolean;
    blockedReason?: string;
    flags: string[];
  }> {
    const flags = [];

    // Check supported methods
    const supportedMethods = ["card", "bank_transfer", "crypto", "wallet"];
    if (!supportedMethods.includes(request.method)) {
      return {
        allowed: false,
        blockedReason: "Unsupported payment method",
        flags: ["unsupported_method"]
      };
    }

    flags.push("method_supported");

    // Check amount limits
    if (request.amount <= 0 || request.amount > 100000) {
      return {
        allowed: false,
        blockedReason: "Invalid payment amount",
        flags: ["invalid_amount"]
      };
    }

    flags.push("amount_valid");
    return { allowed: true, flags };
  }

  /**
   * Perform payment fraud check
   */
  private async performPaymentFraudCheck(request: PaymentsRequest): Promise<{
    allowed: boolean;
    blockedReason?: string;
    flags: string[];
  }> {
    const flags = [];

    // Simulate fraud scoring
    const fraudScore = Math.random();
    if (fraudScore > 0.8) {
      return {
        allowed: false,
        blockedReason: "Payment flagged for fraud review",
        flags: ["high_fraud_risk"]
      };
    }

    flags.push("fraud_check_passed");
    if (fraudScore > 0.5) flags.push("moderate_risk");

    return { allowed: true, flags };
  }

  /**
   * Validate FX compliance
   */
  private async validateFxCompliance(request: PaymentsRequest): Promise<{
    allowed: boolean;
    blockedReason?: string;
    flags: string[];
  }> {
    const flags = [];

    // Check currency support
    const supportedCurrencies = ["USD", "EUR", "GBP", "JPY", "BTC", "ETH"];
    if (!supportedCurrencies.includes(request.currency)) {
      return {
        allowed: false,
        blockedReason: "Unsupported currency",
        flags: ["unsupported_currency"]
      };
    }

    flags.push("currency_supported");

    // Validate FX rate if provided
    if (request.context?.fxRate && (request.context.fxRate <= 0 || request.context.fxRate > 10)) {
      return {
        allowed: false,
        blockedReason: "Invalid FX rate",
        flags: ["invalid_fx_rate"]
      };
    }

    flags.push("fx_compliant");
    return { allowed: true, flags };
  }

  /**
   * Execute payment operation
   */
  private async executePaymentOperation(request: PaymentsRequest): Promise<any> {
    const result = await this.kafkaClient
      .send("payments.execute", {
        paymentId: request.paymentId,
        userId: request.userId,
        amount: request.amount,
        currency: request.currency,
        method: request.method,
        action: request.action,
        context: request.context,
        edgeValidated: true,
        timestamp: new Date().toISOString()
      })
      .toPromise();

    return result;
  }
}
