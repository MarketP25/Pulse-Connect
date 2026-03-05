/**
 * Stripe Payment Gateway Implementation
 */

import { PaymentGateway } from '../gateway.interface';
import { verifyWebhookSignatureHmacSha256 } from '../utils/webhook-signature';
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
} from '../types';

export default class StripeGateway implements PaymentGateway {
  readonly name = 'stripe';
  readonly config: GatewayConfig;

  constructor(config: GatewayConfig) {
    this.config = config;
  }

  async createPayment(request: PaymentRequest): Promise<PaymentResponse> {
    try {
      // In production, this would use the Stripe SDK:
      // const stripe = require('stripe')(this.config.apiKey);
      // const paymentIntent = await stripe.paymentIntents.create({...});
      
      // For now, return a mock response with the expected structure
      const transactionId = `pi_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      return {
        success: true,
        transactionId,
        status: 'captured' as PaymentStatus,
        amount: request.amount,
        currency: request.currency.toUpperCase(),
        gateway: this.name,
        gatewayTransactionId: transactionId,
        message: 'Payment successful',
        metadata: {
          customerId: request.customerId,
          idempotencyKey: request.idempotencyKey,
        },
        createdAt: new Date(),
      };
    } catch (error: any) {
      return {
        success: false,
        status: 'failed' as PaymentStatus,
        amount: request.amount,
        currency: request.currency.toUpperCase(),
        gateway: this.name,
        errorCode: error.code || 'stripe_error',
        errorMessage: error.message || 'Payment failed',
        createdAt: new Date(),
      };
    }
  }

  async getPayment(transactionId: string): Promise<PaymentResponse> {
    // In production: stripe.paymentIntents.retrieve(transactionId)
    return {
      success: true,
      transactionId,
      status: 'captured' as PaymentStatus,
      amount: 0,
      currency: 'USD',
      gateway: this.name,
      gatewayTransactionId: transactionId,
      createdAt: new Date(),
    };
  }

  async refund(request: RefundRequest): Promise<RefundResponse> {
    const refundId = `re_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    return {
      success: true,
      refundId,
      status: 'succeeded',
      amount: request.amount || 0,
      currency: 'USD',
      gateway: this.name,
      message: 'Refund processed successfully',
    };
  }

  async createCustomer(customer: Customer): Promise<CustomerResponse> {
    const customerId = `cus_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    return {
      success: true,
      customerId,
      gateway: this.name,
      email: customer.email,
      metadata: customer.metadata,
    };
  }

  async updateCustomer(customerId: string, customer: Customer): Promise<CustomerResponse> {
    return {
      success: true,
      customerId,
      gateway: this.name,
      email: customer.email,
      metadata: customer.metadata,
    };
  }

  async getCustomer(customerId: string): Promise<CustomerResponse> {
    return {
      success: true,
      customerId,
      gateway: this.name,
      email: 'customer@example.com',
    };
  }

  async createPaymentIntent(request: PaymentRequest): Promise<PaymentIntent> {
    const clientSecret = `${Date.now()}_secret_${Math.random().toString(36).substr(2, 9)}`;
    return {
      id: `pi_${Date.now()}`,
      clientSecret,
      amount: request.amount,
      currency: request.currency,
      status: 'pending' as PaymentStatus,
      metadata: request.metadata,
    };
  }

  async handleWebhook(payload: any, signature?: string): Promise<WebhookEvent> {
    // In production: stripe.webhooks.constructEvent(payload, signature, this.config.webhookSecret)
    return {
      id: `evt_${Date.now()}`,
      type: payload.type || 'payment.success',
      data: payload.data || {},
      timestamp: new Date(),
      processed: false,
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
      supportsQRCodePayments: false,
      supportsSubscriptions: true,
      supportsRefunds: true,
      supportsPartialRefunds: true,
      maximumRefundPercentage: 100,
      supportsMultiCurrency: true,
      maxTransactionAmount: 99999999,
      minTransactionAmount: 50, // $0.50
    };
  }

  async healthCheck(): Promise<boolean> {
    // In production: make a test API call to Stripe
    return this.config.enabled && !!this.config.apiKey;
  }
}
