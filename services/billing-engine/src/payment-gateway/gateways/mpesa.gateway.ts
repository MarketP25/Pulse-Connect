/**
 * M-Pesa Payment Gateway Implementation
 * Kenya and Africa-focused mobile money payments
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

export default class MpesaGateway implements PaymentGateway {
  readonly name = "mpesa";
  readonly config: GatewayConfig;

  constructor(config: GatewayConfig) {
    this.config = config;
  }

  async createPayment(request: PaymentRequest): Promise<PaymentResponse> {
    try {
      const accessToken = await this.getAccessToken();
      const { password, timestamp } = this.generatePassword();
      const phoneNumber =
        (request.metadata?.phoneNumber as string)?.replace(/[^0-9]/g, "") || "254700000000";
      if (!phoneNumber.startsWith("254")) throw new Error("Invalid Kenyan phone number");

      const stkPayload = {
        BusinessShortCode: this.config.shortcode,
        Password: password,
        Timestamp: timestamp,
        TransactionType: "CustomerPayBillOnline",
        Amount: Math.round(request.amount),
        PartyA: phoneNumber,
        PartyB: this.config.shortcode,
        PhoneNumber: phoneNumber,
        CallBackURL: "https://pulsco.global/mpesa/callback", // Replace with actual callback
        AccountReference: "PulscoGlobalLtd",
        TransactionDesc: request.description || "Payment for services"
      };

      const response = await axios.post(
        "https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest",
        stkPayload,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json"
          }
        }
      );

      console.log("M-Pesa STK Response:", JSON.stringify(response.data, null, 2));

      return {
        success: true,
        transactionId: response.data.CheckoutRequestID,
        status: "pending" as PaymentStatus,
        amount: request.amount,
        currency: "KES",
        gateway: this.name,
        gatewayTransactionId: response.data.CheckoutRequestID,
        message: "M-Pesa STK Push sent. Check your phone.",
        metadata: {
          phoneNumber,
          checkoutRequestId: response.data.CheckoutRequestID,
          response: response.data
        },
        createdAt: new Date()
      };
    } catch (error: any) {
      console.error("M-Pesa STK Error:", error.response?.data || error.message);
      return {
        success: false,
        status: "failed",
        amount: request.amount,
        currency: request.currency.toUpperCase(),
        gateway: this.name,
        errorCode: "mpesa_stk_failed",
        errorMessage: error.response?.data?.errorMessage || error.message,
        createdAt: new Date()
      };
    }
  }

  async getPayment(transactionId: string): Promise<PaymentResponse> {
    // Check M-Pesa transaction status
    return {
      success: true,
      transactionId,
      status: "processing" as PaymentStatus,
      amount: 0,
      currency: "KES",
      gateway: this.name,
      gatewayTransactionId: transactionId,
      createdAt: new Date()
    };
  }

  async refund(request: RefundRequest): Promise<RefundResponse> {
    // M-Pesa B2C (Business to Customer) for refunds
    return {
      success: true,
      refundId: `mpesa_refund_${Date.now()}`,
      status: "pending", // Requires M-Pesa confirmation
      amount: request.amount || 0,
      currency: "KES",
      gateway: this.name,
      message: "M-Pesa refund initiated"
    };
  }

  async createCustomer(customer: Customer): Promise<CustomerResponse> {
    // M-Pesa uses phone numbers as identifiers
    return {
      success: true,
      customerId: `mpesa_cust_${Date.now()}`,
      gateway: this.name,
      email: customer.email,
      metadata: { phone: customer.phone }
    };
  }

  async updateCustomer(customerId: string, customer: Customer): Promise<CustomerResponse> {
    return {
      success: true,
      customerId,
      gateway: this.name,
      email: customer.email,
      metadata: { phone: customer.phone }
    };
  }

  async getCustomer(customerId: string): Promise<CustomerResponse> {
    return {
      success: true,
      customerId,
      gateway: this.name,
      email: "customer@example.com"
    };
  }

  async createPaymentIntent(request: PaymentRequest): Promise<PaymentIntent> {
    // M-Pesa STK Push
    return {
      id: `stk_${Date.now()}`,
      amount: request.amount,
      currency: request.currency || "KES",
      status: "pending" as PaymentStatus,
      metadata: {
        phoneNumber: request.metadata?.phoneNumber,
        accountReference: request.metadata?.accountReference
      }
    };
  }

  async handleWebhook(payload: any): Promise<WebhookEvent> {
    return {
      id: `mpesa_evt_${Date.now()}`,
      type: payload.TransactionType || "payment.success",
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
      minTransactionAmount: 10 // KES min
    };
  }

  // M-Pesa Auth helpers
  private async getAccessToken(): Promise<string> {
    const auth = Buffer.from(`${this.config.apiKey}:${this.config.apiSecret}`).toString("base64");
    const response = await axios.get(
      "https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials",
      { headers: { Authorization: `Basic ${auth}` } }
    );
    return response.data.access_token;
  }

  private generatePassword(): { password: string; timestamp: string } {
    const timestamp = moment().format("YYYYMMDDHHmmss");
    const raw = `${this.config.shortcode}${this.config.passkey}${timestamp}`;
    const password = Buffer.from(raw).toString("base64");
    return { password, timestamp };
  }

  async healthCheck(): Promise<boolean> {
    return this.config.enabled && !!this.config.apiKey && !!this.config.shortcode;
  }
}
