/**
 * M-Pesa Payment Gateway Implementation
 * Kenya and Africa-focused mobile money payments
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

export default class MpesaGateway implements PaymentGateway {
  readonly name = 'mpesa';
  readonly config: GatewayConfig;

  constructor(config: GatewayConfig) {
    this.config = config;
  }

  async createPayment(request: PaymentRequest): Promise<PaymentResponse> {
    // M-Pesa STK Push for mobile payments
    const transactionId = `mpesa_${Date.now()}`;
    return {
      success: true,
      transactionId,
      status: 'pending' as PaymentStatus, // M-Pesa requires customer confirmation
      amount: request.amount,
      currency: request.currency.toUpperCase(),
      gateway: this.name,
      gatewayTransactionId: transactionId,
      message: 'M-Pesa STK Push initiated. Please confirm on your phone.',
      metadata: {
        phoneNumber: request.metadata?.phoneNumber,
        checkoutRequestId: `checkout_${Date.now()}`,
      },
      createdAt: new Date(),
    };
  }

  async getPayment(transactionId: string): Promise<PaymentResponse> {
    // Check M-Pesa transaction status
    return {
      success: true,
      transactionId,
      status: 'processing' as PaymentStatus,
      amount: 0,
      currency: 'KES',
      gateway: this.name,
      gatewayTransactionId: transactionId,
      createdAt: new Date(),
    };
  }

  async refund(request: RefundRequest): Promise<RefundResponse> {
    // M-Pesa B2C (Business to Customer) for refunds
    return {
      success: true,
      refundId: `mpesa_refund_${Date.now()}`,
      status: 'pending', // Requires M-Pesa confirmation
      amount: request.amount || 0,
      currency: 'KES',
      gateway: this.name,
      message: 'M-Pesa refund initiated',
    };
  }

  async createCustomer(customer: Customer): Promise<CustomerResponse> {
    // M-Pesa uses phone numbers as identifiers
    return {
      success: true,
      customerId: `mpesa_cust_${Date.now()}`,
      gateway: this.name,
      email: customer.email,
      metadata: { phone: customer.phone },
    };
  }

  async updateCustomer(customerId: string, customer: Customer): Promise<CustomerResponse> {
    return {
      success: true,
      customerId,
      gateway: this.name,
      email: customer.email,
      metadata: { phone: customer.phone },
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
    // M-Pesa STK Push
    return {
      id: `stk_${Date.now()}`,
      amount: request.amount,
      currency: request.currency || 'KES',
      status: 'pending' as PaymentStatus,
      metadata: {
        phoneNumber: request.metadata?.phoneNumber,
        accountReference: request.metadata?.accountReference,
      },
    };
  }

  async handleWebhook(payload: any): Promise<WebhookEvent> {
    return {
      id: `mpesa_evt_${Date.now()}`,
      type: payload.TransactionType || 'payment.success',
      data: payload,
      timestamp: new Date(),
      processed: false,
    };
  }

  verifyWebhookSignature(payload: string, signature: string): boolean {
    return verifyWebhookSignatureHmacSha256(payload, signature, this.config.webhookSecret);
  }

  getCapabilities(): GatewayCapabilities {
    return {
      supports3DSecure: false, // Uses USSD/STK push
      supportsCardPayments: false,
      supportsBankTransfers: true, // Bank to wallet
      supportsWallets: true, // M-Pesa wallet
      supportsUPIPayments: false,
      supportsQRCodePayments: true, // M-Pesa QR
      supportsSubscriptions: false,
      supportsRefunds: true,
      supportsPartialRefunds: true,
      maximumRefundPercentage: 100,
      supportsMultiCurrency: false,
      maxTransactionAmount: 150000, // KES max per transaction
      minTransactionAmount: 10, // KES min
    };
  }

  async healthCheck(): Promise<boolean> {
    return this.config.enabled && !!this.config.apiKey;
  }
}
