/**
 * Payment Gateway Interface
 * Base interface that all payment gateways must implement
 */

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
  GatewayCapabilities
} from "./types";

export interface PaymentGateway {
  readonly name: string;
  readonly config: GatewayConfig;

  // Core payment operations
  createPayment(request: PaymentRequest): Promise<PaymentResponse>;
  getPayment(transactionId: string): Promise<PaymentResponse>;
  refund(request: RefundRequest): Promise<RefundResponse>;

  // Customer management
  createCustomer(customer: Customer): Promise<CustomerResponse>;
  updateCustomer(customerId: string, customer: Customer): Promise<CustomerResponse>;
  getCustomer(customerId: string): Promise<CustomerResponse>;

  // Payment intents (for 3D Secure)
  createPaymentIntent(request: PaymentRequest): Promise<PaymentIntent>;

  // Webhook handling
  handleWebhook(payload: any, signature?: string): Promise<WebhookEvent>;
  verifyWebhookSignature(payload: string, signature: string): boolean;

  // Capabilities
  getCapabilities(): GatewayCapabilities;

  // Health check
  healthCheck(): Promise<boolean>;
}
