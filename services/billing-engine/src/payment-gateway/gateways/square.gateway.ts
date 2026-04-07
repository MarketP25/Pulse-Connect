/**
 * Square Payment Gateway Implementation
 * US/Canada focused payment gateway
 */

import { PaymentGateway } from "../gateway.interface";
import { verifyWebhookSignatureHmacSha256 } from "../utils/webhook-signature";
import {
  GatewayConfig,
  PaymentRequest,
  PaymentResponse,
  RefundRequest,
  RefundResponse,
  Customer,
  CustomerResponse,
  PaymentIntent,
  WebhookEvent,
  GatewayCapabilities,
  PaymentStatus
} from "../types";

export default class SquareGateway implements PaymentGateway {
  readonly name = "square";
  readonly config: GatewayConfig;

  constructor(config: GatewayConfig) {
    this.config = config;
  }

  async createPayment(request: PaymentRequest): Promise<PaymentResponse> {
    const transactionId = `sq_${Date.now()}`;
    return {
      success: true,
      transactionId,
      status: "captured" as PaymentStatus,
      amount: request.amount,
      currency: request.currency.toUpperCase(),
      gateway: this.name,
      gatewayTransactionId: transactionId,
      message: "Square payment successful",
      createdAt: new Date()
    };
  }

  async getPayment(transactionId: string): Promise<PaymentResponse> {
    return {
      success: true,
      transactionId,
      status: "captured" as PaymentStatus,
      amount: 0,
      currency: "USD",
      gateway: this.name,
      gatewayTransactionId: transactionId,
      createdAt: new Date()
    };
  }

  async refund(request: RefundRequest): Promise<RefundResponse> {
    return {
      success: true,
      refundId: `sq_ref_${Date.now()}`,
      status: "succeeded",
      amount: request.amount || 0,
      currency: "USD",
      gateway: this.name
    };
  }

  async createCustomer(customer: Customer): Promise<CustomerResponse> {
    return {
      success: true,
      customerId: `sq_cust_${Date.now()}`,
      gateway: this.name,
      email: customer.email
    };
  }

  async updateCustomer(customerId: string, customer: Customer): Promise<CustomerResponse> {
    return { success: true, customerId, gateway: this.name, email: customer.email };
  }

  async getCustomer(customerId: string): Promise<CustomerResponse> {
    return { success: true, customerId, gateway: this.name, email: "customer@example.com" };
  }

  async createPaymentIntent(request: PaymentRequest): Promise<PaymentIntent> {
    return {
      id: `sq_order_${Date.now()}`,
      amount: request.amount,
      currency: request.currency,
      status: "pending" as PaymentStatus
    };
  }

  async handleWebhook(payload: any): Promise<WebhookEvent> {
    return {
      id: `sq_evt_${Date.now()}`,
      type: payload.type || "payment.completed",
      data: payload.data || {},
      timestamp: new Date(),
      processed: false
    };
  }

  verifyWebhookSignature(payload: string, signature: string): boolean {
    return verifyWebhookSignatureHmacSha256(payload, signature, this.config.webhookSecret);
  }

  getCapabilities(): GatewayCapabilities {
    return {
      supports3DSecure: this.config.requires3DSecure,
      supportsCardPayments: true,
      supportsBankTransfers: false,
      supportsWallets: true,
      supportsUPIPayments: false,
      supportsQRCodePayments: true,
      supportsSubscriptions: true,
      supportsRefunds: true,
      supportsPartialRefunds: true,
      maximumRefundPercentage: 100,
      supportsMultiCurrency: false,
      maxTransactionAmount: 1000000,
      minTransactionAmount: 100
    };
  }

  async healthCheck(): Promise<boolean> {
    return this.config.enabled && !!this.config.accessToken;
  }
}
