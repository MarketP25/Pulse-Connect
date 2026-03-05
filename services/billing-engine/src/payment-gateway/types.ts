/**
 * Payment Gateway Types
 * Type definitions for payment gateway integrations
 */

export interface GatewayConfig {
  enabled: boolean;
  name: string;
  apiKey?: string;
  apiSecret?: string;
  clientId?: string;
  clientSecret?: string;
  appId?: string;
  privateKey?: string;
  publicKey?: string;
  alipayPublicKey?: string;
  merchantAccount?: string;
  accessToken?: string;
  locationId?: string;
  mchId?: string;
  certPath?: string;
  webhookSecret?: string;
  publishableKey?: string;
  apiVersion?: string;
  gateway?: string;
  environment?: string;
  mode?: string;
  supportedCurrencies: string[];
  supportedCountries: string[];
  requires3DSecure: boolean;
  logo: string;
}

export interface PaymentRequest {
  amount: number;
  currency: string;
  customerId?: string;
  customerEmail?: string;
  billingCountry?: string;
  paymentMethod?: PaymentMethod;
  metadata?: Record<string, any>;
  idempotencyKey?: string;
  description?: string;
}

export interface PaymentMethod {
  type: 'card' | 'bank_transfer' | 'wallet' | 'upi' | 'qr_code';
  card?: {
    number: string;
    expMonth: number;
    expYear: number;
    cvc: string;
    name?: string;
  };
  bank?: {
    bankCode?: string;
    accountNumber?: string;
  };
  wallet?: 'paypal' | 'alipay' | 'wechatpay';
  upi?: {
    vpa: string;
  };
}

export interface PaymentResponse {
  success: boolean;
  transactionId?: string;
  status: PaymentStatus;
  amount: number;
  currency: string;
  gateway: string;
  gatewayTransactionId?: string;
  message?: string;
  errorCode?: string;
  errorMessage?: string;
  metadata?: Record<string, any>;
  redirectUrl?: string;
  createdAt: Date;
}

export type PaymentStatus = 
  | 'pending'
  | 'processing'
  | 'authorized'
  | 'captured'
  | 'failed'
  | 'refunded'
  | 'partially_refunded'
  | 'cancelled'
  | 'expired';

export interface RefundRequest {
  transactionId: string;
  amount?: number; // Full refund if not specified
  reason?: string;
  idempotencyKey?: string;
}

export interface RefundResponse {
  success: boolean;
  refundId?: string;
  status: 'succeeded' | 'pending' | 'failed';
  amount: number;
  currency: string;
  gateway: string;
  message?: string;
  errorCode?: string;
  errorMessage?: string;
}

export interface Customer {
  id?: string;
  email: string;
  name?: string;
  phone?: string;
  country?: string;
  metadata?: Record<string, any>;
}

export interface CustomerResponse {
  success: boolean;
  customerId: string;
  gateway: string;
  email: string;
  metadata?: Record<string, any>;
}

export interface PaymentIntent {
  id: string;
  clientSecret?: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  metadata?: Record<string, any>;
}

export interface WebhookEvent {
  id: string;
  type: WebhookEventType;
  data: Record<string, any>;
  timestamp: Date;
  processed: boolean;
}

export type WebhookEventType = 
  | 'payment.success'
  | 'payment.failed'
  | 'payment.refunded'
  | 'payment.captured'
  | 'payment.authorized'
  | 'customer.created'
  | 'customer.updated'
  | 'dispute.opened'
  | 'dispute.resolved'
  | 'subscription.created'
  | 'subscription.updated'
  | 'subscription.cancelled';

export interface GatewayCapabilities {
  supports3DSecure: boolean;
  supportsCardPayments: boolean;
  supportsBankTransfers: boolean;
  supportsWallets: boolean;
  supportsUPIPayments: boolean;
  supportsQRCodePayments: boolean;
  supportsSubscriptions: boolean;
  supportsRefunds: boolean;
  supportsPartialRefunds: boolean;
  maximumRefundPercentage?: number;
  supportsMultiCurrency: boolean;
  maxTransactionAmount: number;
  minTransactionAmount: number;
}

export interface TransactionFee {
  amount: number;
  currency: string;
  breakdown: {
    gatewayFee: number;
    platformFee: number;
    tax?: number;
  };
}

export interface ExchangeRate {
  from: string;
  to: string;
  rate: number;
  timestamp: Date;
}
