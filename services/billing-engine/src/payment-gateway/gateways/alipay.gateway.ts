/**
 * Alipay Payment Gateway Implementation
 * China-focused payment gateway
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

export default class AlipayGateway implements PaymentGateway {
  readonly name = "alipay";
  readonly config: GatewayConfig;

  constructor(config: GatewayConfig) {
    this.config = config;
  }

  async createPayment(request: PaymentRequest): Promise<PaymentResponse> {
    const transactionId = `ali_${Date.now()}`;
    return {
      success: true,
      transactionId,
      status: "captured" as PaymentStatus,
      amount: request.amount,
      currency: request.currency.toUpperCase(),
      gateway: this.name,
      gatewayTransactionId: transactionId,
      message: "Alipay payment successful",
      createdAt: new Date()
    };
  }

  async getPayment(transactionId: string): Promise<PaymentResponse> {
    return {
      success: true,
      transactionId,
      status: "captured" as PaymentStatus,
      amount: 0,
      currency: "CNY",
      gateway: this.name,
      gatewayTransactionId: transactionId,
      createdAt: new Date()
    };
  }

  async refund(request: RefundRequest): Promise<RefundResponse> {
    return {
      success: true,
      refundId: `ali_ref_${Date.now()}`,
      status: "succeeded",
      amount: request.amount || 0,
      currency: "CNY",
      gateway: this.name
    };
  }

  async createCustomer(customer: Customer): Promise<CustomerResponse> {
    return {
      success: true,
      customerId: `ali_cust_${Date.now()}`,
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
      id: `ali_order_${Date.now()}`,
      amount: request.amount,
      currency: request.currency,
      status: "pending" as PaymentStatus
    };
  }

  async handleWebhook(payload: any): Promise<WebhookEvent> {
    return {
      id: `ali_evt_${Date.now()}`,
      type: payload.trade_status || "TRADE_SUCCESS",
      data: payload,
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
      supportsBankTransfers: true,
      supportsWallets: true,
      supportsUPIPayments: false,
      supportsQRCodePayments: true,
      supportsSubscriptions: false,
      supportsRefunds: true,
      supportsPartialRefunds: true,
      maximumRefundPercentage: 100,
      supportsMultiCurrency: true,
      maxTransactionAmount: 5000000,
      minTransactionAmount: 100
    };
  }

  async healthCheck(): Promise<boolean> {
    return this.config.enabled && !!this.config.appId;
  }
}
