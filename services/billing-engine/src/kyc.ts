/**
 * KYC (Know Your Customer) Service for Billing Engine
 * Handles verification for premium and enterprise users with 4-week re-verification
 */

import { WalletRecord } from "./types";

export type KYCSessionStatus = "pending" | "approved" | "rejected" | "expired";

export interface KYCSession {
  sessionId: string;
  userId: string;
  tier: "premium" | "enterprise";
  status: KYCSessionStatus;
  level: "basic" | "enhanced" | "full";
  submittedAt: string;
  verifiedAt?: string;
  expiryDate?: string;
  documents?: string[];
  rejectionReason?: string;
  lastVerifiedAt?: string;
}

export interface KYCNotification {
  userId: string;
  walletId: string;
  type: "reminder" | "expiry_warning" | "verification_required" | "verification_complete";
  message: string;
  sentAt: string;
  expiresAt?: string;
}

/**
 * KYC Service - Manages verification for non-basic users
 * Re-verification required every 4 weeks for premium/enterprise users
 */
export class KYCService {
  private kycSessions = new Map<string, KYCSession>();
  private notifications: KYCNotification[] = [];

  // 4 weeks in milliseconds
  private readonly REVERIFICATION_INTERVAL_MS = 4 * 7 * 24 * 60 * 60 * 1000;

  /**
   * Check if a user requires KYC verification based on their tier
   * Basic (free tier) users do NOT require KYC - but they CANNOT verify
   * Premium and Enterprise users MUST be verified
   * Basic users can ONLY verify when upgrading to premium/enterprise
   */
  requiresKYC(tier: string): boolean {
    return tier !== "basic";
  }

  /**
   * Check if a basic user can initiate KYC verification
   * Basic users can only verify when upgrading their tier
   * @param currentTier - the user's current tier
   * @param targetTier - the tier they want to upgrade to (if any)
   */
  canInitiateKYC(currentTier: string, targetTier?: string): boolean {
    // If already premium or enterprise, can always initiate
    if (currentTier === "premium" || currentTier === "enterprise") {
      return true;
    }
    // Basic users can only initiate if they're upgrading to premium/enterprise
    if (targetTier === "premium" || targetTier === "enterprise") {
      return true;
    }
    // Basic users cannot initiate KYC without upgrading
    return false;
  }

  /**
   * Get message explaining why KYC cannot be initiated
   */
  getKYCRestrictionMessage(currentTier: string, targetTier?: string): string {
    if (currentTier === "basic" && !targetTier) {
      return "KYC verification is only available when you upgrade to Premium or Enterprise tier. Please upgrade your account to complete verification.";
    }
    return "Unable to initiate KYC verification. Please contact support.";
  }

  /**
   * Check if a wallet has valid KYC status
   */
  isKYCVerified(wallet: WalletRecord): boolean {
    // Basic tier doesn't need KYC
    if (wallet.tier === "basic") {
      return true;
    }

    // Non-basic tiers must have KYC verified
    if (!wallet.kycVerified) {
      return false;
    }

    // Check if KYC has expired
    if (wallet.kycExpiryDate) {
      const expiryDate = new Date(wallet.kycExpiryDate);
      if (expiryDate < new Date()) {
        return false;
      }
    }

    return true;
  }

  /**
   * Check if KYC re-verification is needed (every 4 weeks)
   */
  requiresReverification(wallet: WalletRecord): boolean {
    if (wallet.tier === "basic" || !wallet.kycVerifiedAt) {
      return false;
    }

    const lastVerified = new Date(wallet.kycVerifiedAt).getTime();
    const now = Date.now();
    const timeSinceLastVerification = now - lastVerified;

    // Re-verify if 4 weeks have passed
    return timeSinceLastVerification >= this.REVERIFICATION_INTERVAL_MS;
  }

  /**
   * Get days remaining until re-verification is needed
   */
  getDaysUntilReverification(wallet: WalletRecord): number | null {
    if (wallet.tier === "basic" || !wallet.kycVerifiedAt) {
      return null;
    }

    const lastVerified = new Date(wallet.kycVerifiedAt).getTime();
    const nextReverify = lastVerified + this.REVERIFICATION_INTERVAL_MS;
    const daysRemaining = Math.ceil((nextReverify - Date.now()) / (1000 * 60 * 60 * 24));

    return Math.max(0, daysRemaining);
  }

  /**
   * Send notification to user about KYC status
   */
  private sendNotification(
    userId: string,
    walletId: string,
    type: KYCNotification["type"],
    message: string,
    expiresAt?: string
  ): void {
    const notification: KYCNotification = {
      userId,
      walletId,
      type,
      message,
      sentAt: new Date().toISOString(),
      expiresAt
    };
    this.notifications.push(notification);
    console.log(`[KYC Notification] User ${userId}: ${message}`);
  }

  /**
   * Check and send reminders for upcoming KYC re-verification
   * Should be called periodically (e.g., daily cron job)
   */
  checkAndNotifyReverification(wallet: WalletRecord): KYCNotification[] {
    const sentNotifications: KYCNotification[] = [];

    if (wallet.tier === "basic") {
      return sentNotifications;
    }

    const daysRemaining = this.getDaysUntilReverification(wallet);

    // Send notification 1 week before expiry
    if (daysRemaining !== null && daysRemaining <= 7 && daysRemaining > 0) {
      const notificationMessage = `Your KYC verification expires in ${daysRemaining} day(s). Please re-verify to continue using premium features.`;
      this.sendNotification(
        wallet.accountId,
        wallet.walletId,
        "expiry_warning",
        notificationMessage
      );
      sentNotifications.push(this.notifications[this.notifications.length - 1]);
    }

    // Send notification if re-verification is due
    if (this.requiresReverification(wallet)) {
      const notificationMessage = `Your KYC verification has expired. Please complete re-verification to continue using premium features.`;
      this.sendNotification(
        wallet.accountId,
        wallet.walletId,
        "verification_required",
        notificationMessage
      );
      sentNotifications.push(this.notifications[this.notifications.length - 1]);
    }

    return sentNotifications;
  }

  /**
   * Get the required KYC level based on tier
   */
  getRequiredKYCLevel(tier: string): "none" | "basic" | "enhanced" | "full" {
    switch (tier) {
      case "basic":
        return "none";
      case "premium":
        return "basic";
      case "enterprise":
        return "enhanced";
      default:
        return "none";
    }
  }

  /**
   * Initiate KYC verification for a user
   * @param userId - the user initiating KYC
   * @param tier - the target tier (premium or enterprise)
   * @param currentTier - the user's current tier (required to check if basic user can initiate)
   */
  initiateKYC(
    userId: string,
    tier: "premium" | "enterprise",
    currentTier: string
  ): KYCSession | { error: string; allowed: false } {
    // Check if user can initiate KYC based on their current tier
    if (!this.canInitiateKYC(currentTier, tier)) {
      return {
        error: this.getKYCRestrictionMessage(currentTier, tier),
        allowed: false
      };
    }

    const sessionId = `kyc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const level = tier === "premium" ? "basic" : "enhanced";

    const session: KYCSession = {
      sessionId,
      userId,
      tier,
      status: "pending",
      level,
      submittedAt: new Date().toISOString()
    };

    this.kycSessions.set(sessionId, session);

    // Send notification about verification requirement
    const message =
      tier === "enterprise"
        ? "Enterprise tier requires enhanced KYC verification. Please complete your verification."
        : "Premium tier requires KYC verification. Please complete your verification.";
    this.sendNotification(userId, "", "verification_required", message);

    return session;
  }

  /**
   * Complete KYC verification (simulates external verification)
   */
  completeKYC(sessionId: string, approved: boolean, reason?: string): KYCSession | null {
    const session = this.kycSessions.get(sessionId);
    if (!session) {
      return null;
    }

    if (approved) {
      session.status = "approved";
      session.verifiedAt = new Date().toISOString();
      session.lastVerifiedAt = new Date().toISOString();

      // Set expiry to 4 weeks from now for re-verification cycle
      const expiryDate = new Date();
      expiryDate.setTime(expiryDate.getTime() + this.REVERIFICATION_INTERVAL_MS);
      session.expiryDate = expiryDate.toISOString();

      // Send confirmation notification
      const message = `Your KYC verification is complete. You will need to re-verify every 4 weeks.`;
      this.sendNotification(
        session.userId,
        "",
        "verification_complete",
        message,
        session.expiryDate
      );
    } else {
      session.status = "rejected";
      session.rejectionReason = reason;

      // Send rejection notification
      const message = `Your KYC verification was rejected. Reason: ${reason || "Please contact support"}`;
      this.sendNotification(session.userId, "", "verification_required", message);
    }

    this.kycSessions.set(sessionId, session);
    return session;
  }

  /**
   * Get KYC session status
   */
  getSessionStatus(sessionId: string): KYCSession | null {
    return this.kycSessions.get(sessionId) || null;
  }

  /**
   * Get all notifications for a user
   */
  getUserNotifications(userId: string): KYCNotification[] {
    return this.notifications.filter((n) => n.userId === userId);
  }

  /**
   * Check if payment can proceed based on KYC status
   * Returns { allowed: boolean, reason?: string }
   */
  checkPaymentEligibility(wallet: WalletRecord): { allowed: boolean; reason?: string } {
    // Basic users can use platform without KYC
    if (wallet.tier === "basic") {
      return { allowed: true };
    }

    // Check if re-verification is needed
    if (this.requiresReverification(wallet)) {
      // Send notification if not already sent
      this.checkAndNotifyReverification(wallet);

      return {
        allowed: false,
        reason: `KYC re-verification required. Your verification expired. Please re-verify to continue.`
      };
    }

    // Premium/Enterprise must have valid KYC
    if (!this.isKYCVerified(wallet)) {
      // Send notification
      const message = `KYC verification required for ${wallet.tier} tier. Please complete verification to proceed.`;
      this.sendNotification(wallet.accountId, wallet.walletId, "verification_required", message);

      return {
        allowed: false,
        reason: `KYC verification required for ${wallet.tier} tier. Please complete verification to proceed.`
      };
    }

    return { allowed: true };
  }
}

export const kycService = new KYCService();
