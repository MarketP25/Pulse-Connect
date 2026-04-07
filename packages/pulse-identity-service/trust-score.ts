export interface TrustScoreInput {
  emailVerified: boolean;
  phoneVerified: boolean;
  kycPassed: boolean;
  referralTrusted: boolean;
  deviceConsistency: boolean;
}

export interface TrustScoreResult {
  score: number;
  components: Record<string, number>;
}

const TRUST_WEIGHTS = {
  emailVerified: 20,
  phoneVerified: 10,
  kycPassed: 25,
  referralTrusted: 15,
  deviceConsistency: 15,
  baseline: 15
};

export function computeInitialTrustScore(input: TrustScoreInput): TrustScoreResult {
  const components = {
    baseline: TRUST_WEIGHTS.baseline,
    emailVerified: input.emailVerified ? TRUST_WEIGHTS.emailVerified : 0,
    phoneVerified: input.phoneVerified ? TRUST_WEIGHTS.phoneVerified : 0,
    kycPassed: input.kycPassed ? TRUST_WEIGHTS.kycPassed : 0,
    referralTrusted: input.referralTrusted ? TRUST_WEIGHTS.referralTrusted : 0,
    deviceConsistency: input.deviceConsistency ? TRUST_WEIGHTS.deviceConsistency : 0
  };

  const score = Math.max(
    0,
    Math.min(
      100,
      components.baseline +
        components.emailVerified +
        components.phoneVerified +
        components.kycPassed +
        components.referralTrusted +
        components.deviceConsistency
    )
  );

  return {
    score,
    components
  };
}
