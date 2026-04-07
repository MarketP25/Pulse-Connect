/**
 * Payment Gateway Registry
 * Manages all payment gateways and their configurations
 */

import { PaymentGateway } from "./gateway.interface";
import { GatewayConfig, PaymentRequest, PaymentResponse } from "./types";
import StripeGateway from "./gateways/stripe.gateway";
import PayPalGateway from "./gateways/paypal.gateway";
import RazorpayGateway from "./gateways/razorpay.gateway";
import AdyenGateway from "./gateways/adyen.gateway";
import SquareGateway from "./gateways/square.gateway";
import AlipayGateway from "./gateways/alipay.gateway";
import WeChatPayGateway from "./gateways/wechatpay.gateway";
import MpesaGateway from "./gateways/mpesa.gateway";

export type GatewayName =
  | "stripe"
  | "paypal"
  | "razorpay"
  | "adyen"
  | "square"
  | "alipay"
  | "wechatpay"
  | "mpesa";

export interface GatewayHealthStatus {
  name: GatewayName;
  healthy: boolean;
  latency: number;
  lastChecked: Date;
}

/**
 * Gateway Registry - Manages all payment gateways
 */
export class GatewayRegistry {
  private gateways: Map<GatewayName, PaymentGateway> = new Map();
  private healthStatus: Map<GatewayName, GatewayHealthStatus> = new Map();
  private config: Record<GatewayName, GatewayConfig>;

  constructor() {
    this.config = this.loadGatewayConfig();
    this.initializeGateways();
  }

  private loadGatewayConfig(): Record<GatewayName, GatewayConfig> {
    const isProduction = process.env.NODE_ENV === "production";

    return {
      stripe: {
        enabled: process.env.STRIPE_ENABLED === "true",
        name: "Stripe",
        apiKey: isProduction ? process.env.STRIPE_SECRET_KEY : process.env.STRIPE_SECRET_KEY_TEST,
        webhookSecret: isProduction
          ? process.env.STRIPE_WEBHOOK_SECRET
          : process.env.STRIPE_WEBHOOK_SECRET_TEST,
        publishableKey: isProduction
          ? process.env.STRIPE_PUBLISHABLE_KEY
          : process.env.STRIPE_PUBLISHABLE_KEY_TEST,
        apiVersion: "2023-10-16",
        supportedCurrencies: [
          "usd",
          "eur",
          "gbp",
          "jpy",
          "aud",
          "cad",
          "chf",
          "cny",
          "inr",
          "brl",
          "mxn",
          "sgd",
          "hkd",
          "nzd",
          "sek",
          "dkk",
          "nok",
          "pln",
          "czk",
          "huf",
          "thb",
          "myr",
          "idr",
          "php",
          "vnd",
          "zar",
          "aed",
          "sar",
          "try",
          "rub",
          "ils",
          "krw",
          "twd"
        ],
        supportedCountries: [
          "US",
          "GB",
          "EU",
          "CA",
          "AU",
          "JP",
          "SG",
          "HK",
          "NZ",
          "IN",
          "BR",
          "MX",
          "ZA",
          "AE",
          "SA",
          "TR",
          "IL",
          "KR",
          "TW",
          "CN",
          "TH",
          "MY",
          "ID",
          "PH",
          "VN"
        ],
        requires3DSecure: true,
        logo: "https://upload.wikimedia.org/wikipedia/commons/b/ba/Stripe_Logo%2C_revised_2016.svg"
      },
      paypal: {
        enabled: process.env.PAYPAL_ENABLED === "true",
        name: "PayPal",
        clientId: isProduction
          ? process.env.PAYPAL_CLIENT_ID
          : process.env.PAYPAL_CLIENT_ID_SANDBOX,
        clientSecret: isProduction
          ? process.env.PAYPAL_CLIENT_SECRET
          : process.env.PAYPAL_CLIENT_SECRET_SANDBOX,
        mode: isProduction ? "live" : "sandbox",
        supportedCurrencies: [
          "usd",
          "eur",
          "gbp",
          "jpy",
          "aud",
          "cad",
          "chf",
          "cny",
          "hkd",
          "sgd",
          "nzd",
          "inr",
          "mxn",
          "brl",
          "php",
          "pln",
          "sek",
          "dkk",
          "nok",
          "thb",
          "vnd",
          "myr",
          "idr"
        ],
        supportedCountries: [
          "US",
          "GB",
          "EU",
          "CA",
          "AU",
          "JP",
          "SG",
          "HK",
          "NZ",
          "IN",
          "BR",
          "MX",
          "PH",
          "PL",
          "SE",
          "DK",
          "NO",
          "TH",
          "VN",
          "MY",
          "ID"
        ],
        requires3DSecure: true,
        logo: "https://upload.wikimedia.org/wikipedia/commons/3/39/PayPal_logo.svg"
      },
      razorpay: {
        enabled: process.env.RAZORPAY_ENABLED === "true",
        name: "Razorpay",
        apiKey: process.env.RAZORPAY_KEY_ID,
        apiSecret: process.env.RAZORPAY_KEY_SECRET,
        supportedCurrencies: ["inr", "usd"],
        supportedCountries: ["IN", "US"],
        requires3DSecure: true,
        logo: "https://upload.wikimedia.org/wikipedia/commons/1/1e/Razorpay_logo.svg"
      },
      adyen: {
        enabled: process.env.ADYEN_ENABLED === "true",
        name: "Adyen",
        apiKey: process.env.ADYEN_API_KEY,
        merchantAccount: process.env.ADYEN_MERCHANT_ACCOUNT,
        environment: isProduction ? "live" : "test",
        supportedCurrencies: [
          "usd",
          "eur",
          "gbp",
          "jpy",
          "aud",
          "cad",
          "chf",
          "cny",
          "hkd",
          "sgd",
          "nzd",
          "inr",
          "brl",
          "mxn",
          "pln",
          "sek",
          "dkk",
          "nok",
          "czk",
          "huf",
          "ron",
          "bgn",
          "hrk",
          "isk"
        ],
        supportedCountries: [
          "US",
          "GB",
          "EU",
          "CA",
          "AU",
          "JP",
          "SG",
          "HK",
          "NZ",
          "IN",
          "BR",
          "MX",
          "PL",
          "SE",
          "DK",
          "NO",
          "CZ",
          "HU",
          "RO",
          "BG",
          "HR",
          "IS"
        ],
        requires3DSecure: true,
        logo: "https://upload.wikimedia.org/wikipedia/commons/2/21/Adyen_logo.svg"
      },
      square: {
        enabled: process.env.SQUARE_ENABLED === "true",
        name: "Square",
        accessToken: process.env.SQUARE_ACCESS_TOKEN,
        locationId: process.env.SQUARE_LOCATION_ID,
        environment: isProduction ? "production" : "sandbox",
        supportedCurrencies: ["usd", "cad", "gbp", "jpy", "aud", "chf", "eur"],
        supportedCountries: ["US", "CA", "GB", "JP", "AU", "CH", "FR", "DE"],
        requires3DSecure: false,
        logo: "https://upload.wikimedia.org/wikipedia/commons/5/5e/Square%2C_Inc._-_Square_logo.svg"
      },
      alipay: {
        enabled: process.env.ALIPAY_ENABLED === "true",
        name: "Alipay",
        appId: process.env.ALIPAY_APP_ID,
        privateKey: process.env.ALIPAY_PRIVATE_KEY,
        alipayPublicKey: process.env.ALIPAY_PUBLIC_KEY,
        gateway: process.env.ALIPAY_GATEWAY || "https://openapi.alipay.com/gateway.do",
        supportedCurrencies: ["cny", "usd", "eur", "gbp", "jpy", "hkd", "sgd", "aud", "cad", "chf"],
        supportedCountries: ["CN", "HK", "SG", "US", "UK", "JP", "AU", "CA", "CH", "DE", "FR"],
        requires3DSecure: false,
        logo: "https://upload.wikimedia.org/wikipedia/commons/5/5e/Alipay_logo.svg"
      },
      wechatpay: {
        enabled: process.env.WECHATPAY_ENABLED === "true",
        name: "WeChat Pay",
        appId: process.env.WECHATPAY_APP_ID,
        mchId: process.env.WECHATPAY_MCH_ID,
        apiKey: process.env.WECHATPAY_API_KEY,
        certPath: process.env.WECHATPAY_CERT_PATH,
        environment: isProduction ? "production" : "sandbox",
        supportedCurrencies: ["cny", "usd"],
        supportedCountries: ["CN", "HK", "SG", "US"],
        requires3DSecure: false,
        logo: "https://upload.wikimedia.org/wikipedia/commons/d/d0/WeChat_Pay_logo.svg"
      },
      mpesa: {
        enabled: process.env.MPESA_ENABLED === "true",
        name: "M-Pesa",
        apiKey: process.env.MPESA_CONSUMER_KEY,
        apiSecret: process.env.MPESA_CONSUMER_SECRET,
        shortcode: process.env.MPESA_SHORTCODE,
        passkey: process.env.MPESA_PASSKEY,
        environment: isProduction ? "production" : "sandbox",
        supportedCurrencies: ["kes", "ugx", "tzs", "zmw"],
        supportedCountries: ["KE", "UG", "TZ", "ZM"],
        requires3DSecure: false,
        logo: "https://upload.wikimedia.org/wikipedia/commons/4/49/M-Pesa_%282021%29.svg"
      }
    };
  }

  private initializeGateways(): void {
    const configs = this.config;

    if (configs.stripe.enabled) {
      this.gateways.set("stripe", new StripeGateway(configs.stripe));
    }
    if (configs.paypal.enabled) {
      this.gateways.set("paypal", new PayPalGateway(configs.paypal));
    }
    if (configs.razorpay.enabled) {
      this.gateways.set("razorpay", new RazorpayGateway(configs.razorpay));
    }
    if (configs.adyen.enabled) {
      this.gateways.set("adyen", new AdyenGateway(configs.adyen));
    }
    if (configs.square.enabled) {
      this.gateways.set("square", new SquareGateway(configs.square));
    }
    if (configs.alipay.enabled) {
      this.gateways.set("alipay", new AlipayGateway(configs.alipay));
    }
    if (configs.wechatpay.enabled) {
      this.gateways.set("wechatpay", new WeChatPayGateway(configs.wechatpay));
    }
    if (configs.mpesa.enabled) {
      this.gateways.set("mpesa", new MpesaGateway(configs.mpesa));
    }
  }

  getGateway(name: GatewayName): PaymentGateway | undefined {
    return this.gateways.get(name);
  }

  getAllGateways(): Map<GatewayName, PaymentGateway> {
    return this.gateways;
  }

  getGatewayConfig(name: GatewayName): GatewayConfig | undefined {
    return this.config[name];
  }

  getAllConfigs(): Record<GatewayName, GatewayConfig> {
    return this.config;
  }

  getEnabledGateways(): GatewayName[] {
    return Array.from(this.gateways.keys());
  }

  getHealthStatus(): GatewayHealthStatus[] {
    return Array.from(this.healthStatus.values());
  }

  updateHealthStatus(name: GatewayName, healthy: boolean, latency: number): void {
    this.healthStatus.set(name, {
      name,
      healthy,
      latency,
      lastChecked: new Date()
    });
  }

  selectOptimalGateway(context: {
    country?: string;
    currency?: string;
    amount?: number;
    paymentMethod?: string;
    userPreferences?: string[];
  }): GatewayName | null {
    const enabledGateways = this.getEnabledGateways();

    if (enabledGateways.length === 0) {
      return null;
    }

    if (context.userPreferences && context.userPreferences.length > 0) {
      const preferred = enabledGateways.find((g) => context.userPreferences!.includes(g));
      if (preferred) return preferred;
    }

    let candidates = enabledGateways.filter((g) => {
      const config = this.config[g];
      return context.currency
        ? config.supportedCurrencies.includes(context.currency.toLowerCase())
        : true;
    });

    if (context.country) {
      candidates = candidates.filter((g) => {
        const config = this.config[g];
        return config.supportedCountries.includes(context.country!);
      });
    }

    if (context.amount && context.amount > 1000) {
      candidates.sort((a, b) => {
        const feeA = this.estimateFee(a, context.amount!);
        const feeB = this.estimateFee(b, context.amount!);
        return feeA - feeB;
      });
    }

    return candidates[0] || enabledGateways[0];
  }

  private estimateFee(gateway: GatewayName, amount: number): number {
    const feeStructures: Record<GatewayName, { fixed: number; percentage: number }> = {
      stripe: { fixed: 0.3, percentage: 2.9 },
      paypal: { fixed: 0.3, percentage: 2.99 },
      razorpay: { fixed: 0, percentage: 2 },
      adyen: { fixed: 0.25, percentage: 2.5 },
      square: { fixed: 0.1, percentage: 2.6 },
      alipay: { fixed: 0, percentage: 1.2 },
      wechatpay: { fixed: 0, percentage: 0.6 },
      mpesa: { fixed: 0, percentage: 1.5 }
    };

    const fees = feeStructures[gateway];
    return fees.fixed + amount * (fees.percentage / 100);
  }
}

export const gatewayRegistry = new GatewayRegistry();
