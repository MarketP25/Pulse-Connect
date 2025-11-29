/**
 * Validates whether a user is eligible for a specific upgrade.
 * Can be extended to check plan tiers, permissions, or usage history.
 */

export interface UpgradeEligibility {
  eligible: boolean;
  reason?: string;
}

export const validateUpgrade = (
  currentTier: string,
  requestedTier: string
): UpgradeEligibility => {
  const tiers = ["basic", "standard", "premium"];
  const currentIndex = tiers.indexOf(currentTier);
  const requestedIndex = tiers.indexOf(requestedTier);

  if (requestedIndex <= currentIndex) {
    return {
      eligible: false,
      reason: "Requested tier is not higher than current tier.",
    };
  }

  return { eligible: true };
};
