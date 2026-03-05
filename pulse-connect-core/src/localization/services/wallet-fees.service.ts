import { Injectable, Logger } from '@nestjs/common';
import { calculateBillingActivityQuote, chargeBillingActivity } from '../../billing/billing-engine.client';

export interface TranslationBillingRequest {
  userId: string;
  serviceType: 'text_translation' | 'speech_translation' | 'video_translation' | 'sign_language';
  sourceLanguage: string;
  targetLanguage: string;
  contentLength: number; // characters or seconds
  quality: 'fast' | 'standard' | 'premium';
  region: string;
  additionalFeatures?: string[]; // subtitles, avatar, etc.
}

export interface BillingResult {
  totalCost: number;
  breakdown: {
    baseCost: number;
    qualityMultiplier: number;
    regionalAdjustment: number;
    featureCosts: number;
    taxes: number;
  };
  currency: string;
  walletBalance: number;
  sufficientFunds: boolean;
  estimatedProcessingTime: number;
  policyVersion?: string;
}

export interface WalletTransaction {
  transactionId: string;
  userId: string;
  amount: number;
  currency: string;
  serviceType: string;
  description: string;
  timestamp: Date;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  region: string;
  complianceFlags: string[];
}

@Injectable()
export class WalletFeesService {
  private readonly logger = new Logger(WalletFeesService.name);

  // PULSCO Planetary Billing Configuration
  private planetaryBilling = {
    baseRates: {
      text_translation: {
        fast: 0.000008,    // per character
        standard: 0.00002,
        premium: 0.00004,
      },
      speech_translation: {
        fast: 0.000015,    // per second
        standard: 0.000035,
        premium: 0.00007,
      },
      video_translation: {
        fast: 0.000025,    // per second
        standard: 0.000055,
        premium: 0.00011,
      },
      sign_language: {
        fast: 0.00002,     // per second
        standard: 0.000045,
        premium: 0.00009,
      },
    },
    regionalMultipliers: {
      'africa-south1': 0.8,    // 20% discount for African users
      'us-central1': 1.0,      // Base rate
      'europe-west1': 1.1,     // 10% premium for EU compliance
      'asia-east1': 0.9,       // 10% discount
      'southamerica-east1': 0.85, // 15% discount
      'me-central1': 0.95,     // 5% discount
    },
    featureCosts: {
      subtitles: 0.000005,    // per character
      avatar_generation: 0.0001, // per second
      voice_customization: 0.00002, // per request
      real_time_streaming: 0.000002, // per second (premium)
    },
    taxes: {
      vat: {
        eu: 0.20,      // 20% VAT for EU
        us: 0.0,       // No VAT in US
        africa: 0.15,  // 15% VAT average
        asia: 0.10,    // 10% GST average
        default: 0.0,
      },
    },
    currency: 'USD',
    freeTier: {
      monthlyLimit: 10000, // characters/seconds
      userTypes: ['basic', 'student', 'researcher'],
    },
  };

  /**
   * Calculate translation billing for a request
   */
  async calculateBilling(request: TranslationBillingRequest): Promise<BillingResult> {
    try {
      this.logger.log(`Calculating billing for ${request.serviceType}: ${request.userId}`);

      // Check free tier eligibility
      const freeTierUsage = await this.checkFreeTierUsage(request.userId, request.serviceType);
      if (freeTierUsage.remaining > request.contentLength) {
        return this.createFreeBillingResult(request);
      }
      const billingQuote = await calculateBillingActivityQuote({
        engine: 'localization',
        amount: request.contentLength,
        units: request.contentLength,
        eventId: `${request.userId}-${request.serviceType}-${Date.now()}`,
        details: {
          chars: request.contentLength,
          serviceType: request.serviceType,
          quality: request.quality,
          sourceLanguage: request.sourceLanguage,
          targetLanguage: request.targetLanguage,
          additionalFeatures: request.additionalFeatures || [],
        },
        region: request.region,
      });
      if (!billingQuote) {
        throw new Error('billing_engine_quote_failed');
      }

      const walletBalance = await this.getWalletBalance(request.userId);
      return {
        totalCost: billingQuote.total,
        breakdown: {
          baseCost: billingQuote.base,
          qualityMultiplier: 0,
          regionalAdjustment: 0,
          featureCosts: billingQuote.fees,
          taxes: billingQuote.tax,
        },
        currency: this.planetaryBilling.currency,
        walletBalance,
        sufficientFunds: walletBalance >= billingQuote.total,
        estimatedProcessingTime: this.estimateProcessingTime(request.quality, request.contentLength),
        policyVersion: billingQuote.policyVersion || 'billing-engine-unversioned',
      };

    } catch (error) {
      this.logger.error('Billing calculation failed:', error);
      throw new Error(`Billing calculation error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Process payment for translation service
   */
  async processPayment(request: TranslationBillingRequest, billing: BillingResult): Promise<WalletTransaction> {
    try {
      if (!billing.sufficientFunds) {
        throw new Error('Insufficient wallet balance');
      }

      // Create transaction record
      const transaction: WalletTransaction = {
        transactionId: this.generateTransactionId(),
        userId: request.userId,
        amount: billing.totalCost,
        currency: billing.currency,
        serviceType: request.serviceType,
        description: `${request.serviceType} (${request.sourceLanguage} -> ${request.targetLanguage})`,
        timestamp: new Date(),
        status: 'pending',
        region: request.region,
        complianceFlags: this.getComplianceFlags(request.region),
      };

      let authoritativeAmount = billing.totalCost;
      if (billing.totalCost > 0) {
        const billingCharge = await chargeBillingActivity({
          accountId: request.userId,
          engine: 'localization',
          amount: request.contentLength,
          units: request.contentLength,
          eventId: `${transaction.transactionId}-charge`,
          details: {
            serviceType: request.serviceType,
            quality: request.quality,
            sourceLanguage: request.sourceLanguage,
            targetLanguage: request.targetLanguage,
            additionalFeatures: request.additionalFeatures || [],
          },
          region: request.region,
          idempotencyKey: transaction.transactionId,
        });
        if (!billingCharge) {
          throw new Error('billing_engine_charge_failed');
        }
        authoritativeAmount = billingCharge.amount;
      }

      transaction.amount = authoritativeAmount;

      // Deduct from wallet
      await this.deductFromWallet(request.userId, authoritativeAmount);

      // Update transaction status
      transaction.status = 'completed';

      this.logger.log(`Payment processed: ${transaction.transactionId} for ${authoritativeAmount} ${billing.currency}`);

      return transaction;

    } catch (error) {
      this.logger.error('Payment processing failed:', error);
      throw new Error(`Payment processing error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Process refund for failed or cancelled translation
   */
  async processRefund(transactionId: string, refundAmount: number, reason: string): Promise<WalletTransaction> {
    try {
      // Find original transaction
      const originalTransaction = await this.getTransaction(transactionId);
      if (!originalTransaction) {
        throw new Error('Transaction not found');
      }

      // Create refund transaction
      const refundTransaction: WalletTransaction = {
        transactionId: this.generateTransactionId(),
        userId: originalTransaction.userId,
        amount: -refundAmount, // Negative for refund
        currency: originalTransaction.currency,
        serviceType: 'refund',
        description: `Refund for ${originalTransaction.serviceType}: ${reason}`,
        timestamp: new Date(),
        status: 'pending',
        region: originalTransaction.region,
        complianceFlags: originalTransaction.complianceFlags,
      };

      // Credit wallet
      await this.creditWallet(originalTransaction.userId, refundAmount);

      // Update transaction status
      refundTransaction.status = 'completed';
      originalTransaction.status = 'refunded';

      this.logger.log(`Refund processed: ${refundTransaction.transactionId} for ${refundAmount} ${originalTransaction.currency}`);

      return refundTransaction;

    } catch (error) {
      this.logger.error('Refund processing failed:', error);
      throw new Error(`Refund processing error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get user's billing history
   */
  async getBillingHistory(
    userId: string,
    timeRange?: { start: Date; end: Date },
    serviceType?: string
  ): Promise<{
    transactions: WalletTransaction[];
    totalSpent: number;
    totalRefunded: number;
    netSpent: number;
    currency: string;
  }> {
    // Mock billing history - in real implementation, query database
    const mockTransactions: WalletTransaction[] = [
      {
        transactionId: 'txn_001',
        userId,
        amount: 0.50,
        currency: 'USD',
        serviceType: 'text_translation',
        description: 'English to Swahili translation',
        timestamp: new Date(Date.now() - 86400000), // 1 day ago
        status: 'completed',
        region: 'africa-south1',
        complianceFlags: ['gdpr', 'popia'],
      },
      {
        transactionId: 'txn_002',
        userId,
        amount: 1.20,
        currency: 'USD',
        serviceType: 'speech_translation',
        description: 'Speech translation with subtitles',
        timestamp: new Date(Date.now() - 43200000), // 12 hours ago
        status: 'completed',
        region: 'us-central1',
        complianceFlags: ['ccpa'],
      },
    ];

    const filteredTransactions = mockTransactions.filter(t => {
      if (serviceType && t.serviceType !== serviceType) return false;
      if (timeRange) {
        if (t.timestamp < timeRange.start || t.timestamp > timeRange.end) return false;
      }
      return true;
    });

    const totalSpent = filteredTransactions
      .filter(t => t.amount > 0)
      .reduce((sum, t) => sum + t.amount, 0);

    const totalRefunded = Math.abs(filteredTransactions
      .filter(t => t.amount < 0)
      .reduce((sum, t) => sum + t.amount, 0));

    return {
      transactions: filteredTransactions,
      totalSpent,
      totalRefunded,
      netSpent: totalSpent - totalRefunded,
      currency: 'USD',
    };
  }

  /**
   * Get planetary billing analytics
   */
  async getBillingAnalytics(timeRange: { start: Date; end: Date }): Promise<{
    totalRevenue: number;
    totalTransactions: number;
    averageTransactionValue: number;
    regionalBreakdown: Record<string, {
      revenue: number;
      transactions: number;
      averageValue: number;
    }>;
    serviceBreakdown: Record<string, {
      revenue: number;
      transactions: number;
      usage: number;
    }>;
    currency: string;
  }> {
    // Mock planetary analytics
    return {
      totalRevenue: 125000.50,
      totalTransactions: 25000,
      averageTransactionValue: 5.00,
      regionalBreakdown: {
        'africa-south1': { revenue: 25000.00, transactions: 5000, averageValue: 5.00 },
        'us-central1': { revenue: 50000.00, transactions: 10000, averageValue: 5.00 },
        'europe-west1': { revenue: 37500.00, transactions: 7500, averageValue: 5.00 },
        'asia-east1': { revenue: 12500.50, transactions: 2500, averageValue: 5.00 },
      },
      serviceBreakdown: {
        text_translation: { revenue: 75000.00, transactions: 15000, usage: 5000000 }, // characters
        speech_translation: { revenue: 37500.00, transactions: 7500, usage: 250000 }, // seconds
        video_translation: { revenue: 10000.00, transactions: 2000, usage: 50000 }, // seconds
        sign_language: { revenue: 2500.50, transactions: 500, usage: 15000 }, // seconds
      },
      currency: 'USD',
    };
  }

  // Private helper methods

  private async checkFreeTierUsage(userId: string, serviceType: string): Promise<{
    used: number;
    remaining: number;
    isEligible: boolean;
  }> {
    // Mock free tier check - in real implementation, query user subscription
    return {
      used: 2500,
      remaining: 7500,
      isEligible: true,
    };
  }

  private createFreeBillingResult(request: TranslationBillingRequest): BillingResult {
    return {
      totalCost: 0,
      breakdown: {
        baseCost: 0,
        qualityMultiplier: 0,
        regionalAdjustment: 0,
        featureCosts: 0,
        taxes: 0,
      },
      currency: this.planetaryBilling.currency,
      walletBalance: 0, // Not needed for free
      sufficientFunds: true,
      estimatedProcessingTime: this.estimateProcessingTime(request.quality, request.contentLength),
    };
  }

  private calculateFeatureCosts(features: string[], contentLength: number): number {
    let total = 0;

    for (const feature of features) {
      const cost = this.planetaryBilling.featureCosts[feature as keyof typeof this.planetaryBilling.featureCosts];
      if (cost) {
        total += cost * contentLength;
      }
    }

    return total;
  }

  private getTaxRate(region: string): number {
    if (region.startsWith('eu')) return this.planetaryBilling.taxes.vat.eu;
    if (region.startsWith('us')) return this.planetaryBilling.taxes.vat.us;
    if (region.startsWith('africa')) return this.planetaryBilling.taxes.vat.africa;
    if (region.startsWith('asia')) return this.planetaryBilling.taxes.vat.asia;

    return this.planetaryBilling.taxes.vat.default;
  }

  private estimateProcessingTime(quality: string, contentLength: number): number {
    const baseTimePerUnit = {
      fast: 0.5,      // seconds per unit
      standard: 1.5,
      premium: 4.0,
    };

    return baseTimePerUnit[quality as keyof typeof baseTimePerUnit] * Math.min(contentLength, 1000); // Cap at 1000 units
  }

  private async getWalletBalance(userId: string): Promise<number> {
    // Mock wallet balance - in real implementation, query wallet service
    return 50.00; // $50 balance
  }

  private async deductFromWallet(userId: string, amount: number): Promise<void> {
    // Mock wallet deduction - in real implementation, call wallet service
    this.logger.log(`Deducted ${amount} USD from wallet ${userId}`);
  }

  private async creditWallet(userId: string, amount: number): Promise<void> {
    // Mock wallet credit - in real implementation, call wallet service
    this.logger.log(`Credited ${amount} USD to wallet ${userId}`);
  }

  private async getTransaction(transactionId: string): Promise<WalletTransaction | null> {
    // Mock transaction lookup - in real implementation, query database
    return {
      transactionId,
      userId: 'user_123',
      amount: 1.50,
      currency: 'USD',
      serviceType: 'text_translation',
      description: 'Mock transaction',
      timestamp: new Date(),
      status: 'completed',
      region: 'us-central1',
      complianceFlags: ['ccpa'],
    };
  }

  private generateTransactionId(): string {
    return `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getComplianceFlags(region: string): string[] {
    if (region.startsWith('eu')) return ['gdpr'];
    if (region.startsWith('us')) return ['ccpa'];
    if (region.startsWith('africa')) return ['popia'];
    if (region.startsWith('asia')) return ['pdpa'];

    return ['standard'];
  }
}
