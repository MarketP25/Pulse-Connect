/**
 * PayPal Payment Gateway Implementation
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

export default class PayPalGateway implements PaymentGateway {
  readonly name = 'paypal';
  readonly config: GatewayConfig;

  constructor(config: GatewayConfig) {
    this.config = config;
  }

  async createPayment(request: PaymentRequest): Promise<PaymentResponse> {
    try {
      const transactionId = `PP_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      return {
        success: true,
        transactionId,
        status: 'captured' as PaymentStatus,
        amount: request.amount,
        currency: request.currency.toUpperCase(),
        gateway: this.name,
        gatewayTransactionId: transactionId,
        message: 'PayPal payment successful',
        metadata: { customerId: request.customerId },
        createdAt: new Date(),
      };
    } catch (error: any) {
      return {
        success: false,
        status: 'failed' as PaymentStatus,
        amount: request.amount,
        currency: request.currency.toUpperCase(),
        gateway: this.name,
        errorCode: 'paypal_error',
        errorMessage: error.message || 'PayPal payment failed',
        createdAt: new Date(),
      };
    }
  }

  async getPayment(transactionId: string): Promise<PaymentResponse> {
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
    const refundId = `PR_${Date.now()}`;
    return {
      success: true,
      refundId,
      status: 'succeeded',
      amount: request.amount || 0,
      currency: 'USD',
      gateway: this.name,
      message: 'PayPal refund processed',
    };
  }

  async createCustomer(customer: Customer): Promise<CustomerResponse> {
    const customerId = `PP_CUS_${Date.now()}`;
    return { success: true, customerId, gateway: this.name, email: customer.email };
  }

  async updateCustomer(customerId: string, customer: Customer): Promise<CustomerResponse> {
    return { success: true, customerId, gateway: this.name, email: customer.email };
  }

  async getCustomer(customerId: string): Promise<CustomerResponse> {
    return { success: true, customerId, gateway: this.name, email: 'customer@example.com' };
  }

  async createPaymentIntent(request: PaymentRequest): Promise<PaymentIntent> {
    const clientSecret = `PP_${Date.now()}_secret`;
    return {
      id: `PP_PI_${Date.now()}`,
      clientSecret,
      amount: request.amount,
      currency: request.currency,
      status: 'pending' as PaymentStatus,
    };
  }

  async handleWebhook(payload: any): Promise<WebhookEvent> {
    return {
      id: `PP_EVT_${Date.now()}`,
      type: payload.event_type || 'payment.success',
      data: payload.resource || {},
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
      supportsBankTransfers: false,
      supportsWallets: true,
      supportsUPIPayments: false,
      supportsQRCodePayments: false,
      supportsSubscriptions: true,
      supportsRefunds: true,
      supportsPartialRefunds: true,
      maximumRefundPercentage: 100,
      supportsMultiCurrency: true,
      maxTransactionAmount: 1000000,
      minTransactionAmount: 100,
    };
  }

  async healthCheck(): Promise<boolean> {
    return this.config.enabled && !!this.config.clientId;
  }
}
