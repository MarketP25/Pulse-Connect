import { Injectable, Logger } from '@nestjs/common';
import { SubsystemAdapter, AdapterResult, AdapterContext } from './subsystem-adapter.interface';
import { ExecuteRequestDto } from '../dto/execute-request.dto';

@Injectable()
export class EcommerceAdapter implements SubsystemAdapter {
  private readonly logger = new Logger(EcommerceAdapter.name);

  readonly subsystemType = 'ecommerce';

  /**
   * Execute ecommerce operations under Edge governance
   */
  async execute(request: ExecuteRequestDto, context: AdapterContext): Promise<AdapterResult> {
    this.logger.log(`Processing ecommerce request: ${request.action} for user ${request.userId}`);

    try {
      switch (request.action) {
        case 'purchase':
          return await this.handlePurchase(request, context);
        case 'add_to_cart':
          return await this.handleAddToCart(request, context);
        case 'checkout':
          return await this.handleCheckout(request, context);
        case 'refund':
          return await this.handleRefund(request, context);
        default:
          throw new Error(`Unsupported ecommerce action: ${request.action}`);
      }
    } catch (error) {
      this.logger.error(`Ecommerce adapter error: ${error.message}`);
      return {
        success: false,
        error: error.message,
        riskFactors: ['adapter_error'],
        metadata: {
          adapter: 'ecommerce',
          action: request.action,
          timestamp: new Date().toISOString(),
        },
      };
    }
  }

  /**
   * Handle purchase transactions with consent and fraud checks
   */
  private async handlePurchase(request: ExecuteRequestDto, context: AdapterContext): Promise<AdapterResult> {
    const { amount, items, paymentMethod } = request.context || {};

    // Consent verification
    const consentValid = await this.verifyPurchaseConsent(request.userId, amount);
    if (!consentValid) {
      return {
        success: false,
        error: 'Purchase consent not granted',
        riskFactors: ['consent_denied'],
        metadata: { reason: 'user_consent_required' },
      };
    }

    // Fraud pre-check
    const fraudRisk = await this.performFraudCheck(request, context);
    if (fraudRisk.score > 0.8) {
      return {
        success: false,
        error: 'Transaction flagged for fraud review',
        riskFactors: ['high_fraud_risk', 'requires_review'],
        metadata: { fraudScore: fraudRisk.score, reasons: fraudRisk.reasons },
      };
    }

    // Compliance check
    const complianceResult = await this.checkCompliance(request, context);
    if (!complianceResult.compliant) {
      return {
        success: false,
        error: 'Transaction violates compliance rules',
        riskFactors: ['compliance_violation'],
        metadata: { violations: complianceResult.violations },
      };
    }

    // Execute purchase
    const purchaseResult = await this.executePurchase(request);

    return {
      success: true,
      data: purchaseResult,
      riskFactors: fraudRisk.score > 0.3 ? ['moderate_risk'] : [],
      metadata: {
        orderId: purchaseResult.orderId,
        amount: amount,
        items: items?.length || 0,
        fraudScore: fraudRisk.score,
      },
    };
  }

  /**
   * Handle add to cart with basic validation
   */
  private async handleAddToCart(request: ExecuteRequestDto, context: AdapterContext): Promise<AdapterResult> {
    const { productId, quantity } = request.context || {};

    // Basic validation
    if (!productId || quantity <= 0) {
      return {
        success: false,
        error: 'Invalid product or quantity',
        riskFactors: ['invalid_input'],
      };
    }

    // Check product availability and pricing
    const productCheck = await this.validateProduct(productId, quantity);
    if (!productCheck.available) {
      return {
        success: false,
        error: productCheck.reason || 'Product unavailable',
        riskFactors: ['product_unavailable'],
      };
    }

    return {
      success: true,
      data: { cartId: this.generateCartId(), productId, quantity },
      riskFactors: [],
      metadata: { productId, quantity, price: productCheck.price },
    };
  }

  /**
   * Handle checkout process
   */
  private async handleCheckout(request: ExecuteRequestDto, context: AdapterContext): Promise<AdapterResult> {
    const { cartId, shippingAddress, billingAddress } = request.context || {};

    // Validate cart
    const cartValid = await this.validateCart(cartId);
    if (!cartValid) {
      return {
        success: false,
        error: 'Invalid or expired cart',
        riskFactors: ['invalid_cart'],
      };
    }

    // Address validation
    const addressValid = await this.validateAddresses(shippingAddress, billingAddress);
    if (!addressValid) {
      return {
        success: false,
        error: 'Invalid shipping or billing address',
        riskFactors: ['invalid_address'],
      };
    }

    return {
      success: true,
      data: { checkoutId: this.generateCheckoutId(), cartId },
      riskFactors: [],
      metadata: { cartId, readyForPayment: true },
    };
  }

  /**
   * Handle refund requests
   */
  private async handleRefund(request: ExecuteRequestDto, context: AdapterContext): Promise<AdapterResult> {
    const { orderId, amount, reason } = request.context || {};

    // Validate refund eligibility
    const refundEligible = await this.checkRefundEligibility(orderId, amount);
    if (!refundEligible.eligible) {
      return {
        success: false,
        error: refundEligible.reason || 'Refund not eligible',
        riskFactors: ['refund_ineligible'],
      };
    }

    // Process refund
    const refundResult = await this.processRefund(orderId, amount, reason);

    return {
      success: true,
      data: refundResult,
      riskFactors: [],
      metadata: { orderId, refundAmount: amount, refundId: refundResult.refundId },
    };
  }

  // Helper methods

  private async verifyPurchaseConsent(userId: string, amount: number): Promise<boolean> {
    // Check user's consent preferences for purchases over certain amounts
    // In production: Query consent service
    return amount < 1000 || Math.random() > 0.1; // 90% consent for high-value purchases
  }

  private async performFraudCheck(request: ExecuteRequestDto, context: AdapterContext): Promise<{ score: number; reasons: string[] }> {
    let score = 0;
    const reasons = [];

    const { amount, paymentMethod, location } = request.context || {};

    // Amount-based risk
    if (amount > 5000) {
      score += 0.4;
      reasons.push('high_amount');
    }

    // Payment method risk
    if (paymentMethod === 'crypto' || paymentMethod === 'wire') {
      score += 0.3;
      reasons.push('high_risk_payment_method');
    }

    // Location risk
    if (location && context.policy?.content?.restrictedRegions?.includes(location.country)) {
      score += 0.5;
      reasons.push('restricted_region');
    }

    // User history (simulated)
    if (request.userId && Math.random() < 0.1) {
      score += 0.2;
      reasons.push('user_history');
    }

    return { score: Math.min(score, 1), reasons };
  }

  private async checkCompliance(request: ExecuteRequestDto, context: AdapterContext): Promise<{ compliant: boolean; violations: string[] }> {
    const violations = [];
    const { amount, items } = request.context || {};

    // Check export controls
    if (items && context.policy?.content?.exportControlledItems) {
      const controlledItems = items.filter(item =>
        context.policy.content.exportControlledItems.includes(item.category)
      );
      if (controlledItems.length > 0) {
        violations.push('export_control_violation');
      }
    }

    // Check sanctions
    if (request.userId && context.policy?.content?.sanctionedUsers?.includes(request.userId)) {
      violations.push('sanctions_violation');
    }

    return {
      compliant: violations.length === 0,
      violations,
    };
  }

  private async executePurchase(request: ExecuteRequestDto): Promise<any> {
    // Simulate purchase execution
    return {
      orderId: this.generateOrderId(),
      status: 'confirmed',
      estimatedDelivery: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    };
  }

  private async validateProduct(productId: string, quantity: number): Promise<{ available: boolean; price?: number; reason?: string }> {
    // Simulate product validation
    if (Math.random() < 0.05) { // 5% out of stock
      return { available: false, reason: 'out_of_stock' };
    }
    return { available: true, price: Math.floor(Math.random() * 100) + 10 };
  }

  private async validateCart(cartId: string): Promise<boolean> {
    // Simulate cart validation
    return cartId && cartId.length > 5;
  }

  private async validateAddresses(shipping: any, billing: any): Promise<boolean> {
    // Basic address validation
    return shipping?.country && billing?.country;
  }

  private async checkRefundEligibility(orderId: string, amount: number): Promise<{ eligible: boolean; reason?: string }> {
    // Simulate refund eligibility check
    if (Math.random() < 0.1) { // 10% ineligible
      return { eligible: false, reason: 'refund_window_expired' };
    }
    return { eligible: true };
  }

  private async processRefund(orderId: string, amount: number, reason: string): Promise<any> {
    return {
      refundId: this.generateRefundId(),
      status: 'processed',
      amount: amount,
      processedAt: new Date().toISOString(),
    };
  }

  // ID generation helpers
  private generateOrderId(): string {
    return `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateCartId(): string {
    return `CART-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateCheckoutId(): string {
    return `CHK-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateRefundId(): string {
    return `REF-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
