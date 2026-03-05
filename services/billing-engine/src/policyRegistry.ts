import { Policy, Offer } from "./types";
import { MARPKV } from "./kms";

export class PolicyRegistry {
  private policies: Policy[] = [];
  private offers: Offer[] = [];
  private verifier?: MARPKV;

  constructor(verifier?: MARPKV) {
    this.verifier = verifier;
  }

  setVerifier(v: MARPKV) {
    this.verifier = v;
  }

  addPolicy(p: Policy) {
    // require signature verification when verifier available
    if (this.verifier) {
      if (!p.signature) throw new Error("policy_missing_signature");
      const ok = this.verifier.verify(p as any);
      if (!ok) throw new Error("policy_signature_invalid");
    }

    // prevent duplicate policy versions
    if (this.policies.find((x) => x.policyId === p.policyId && x.version === p.version)) {
      throw new Error("policy_duplicate_version");
    }

    // Prevent retroactive effectiveFrom that would change historical application
    const newestForScope = this.policies
      .filter((x) => x.scope === p.scope)
      .sort((a, b) => new Date(b.effectiveFrom).getTime() - new Date(a.effectiveFrom).getTime())[0];

    if (newestForScope && new Date(p.effectiveFrom).getTime() < new Date(newestForScope.effectiveFrom).getTime()) {
      throw new Error("policy_retroactive_effective_from");
    }

    // basic validation
    if (p.effectiveUntil && new Date(p.effectiveUntil).getTime() <= new Date(p.effectiveFrom).getTime()) {
      throw new Error("policy_invalid_effective_range");
    }

    this.policies.push(p);
  }

  // Deprecate a policy version (MARP-signed change recommended)
  deprecatePolicy(policyId: string, version: string, effectiveUntilIso: string) {
    const idx = this.policies.findIndex((x) => x.policyId === policyId && x.version === version);
    if (idx === -1) throw new Error("policy_not_found");
    const p = this.policies[idx];
    const until = new Date(effectiveUntilIso).getTime();
    const from = new Date(p.effectiveFrom).getTime();
    if (until <= from) throw new Error("policy_invalid_deprecation");
    p.effectiveUntil = effectiveUntilIso;
    this.policies[idx] = p;
  }

  getPolicyFor(scope: string, atIso: string): Policy | null {
    const at = new Date(atIso).getTime();
    const candidates = this.policies.filter((p) => p.scope === scope);
    candidates.sort((a, b) => new Date(b.effectiveFrom).getTime() - new Date(a.effectiveFrom).getTime());
    for (const c of candidates) {
      const from = new Date(c.effectiveFrom).getTime();
      const until = c.effectiveUntil ? new Date(c.effectiveUntil).getTime() : Infinity;
      if (from <= at && at < until) return c;
    }
    return null;
  }

  // Find policy targeted at a specific activity engine. Policies may use scope 'activity:ENGINE' or scope 'activity' with payload.engine
  getPolicyForEngine(engine: string, atIso: string): Policy | null {
    const at = new Date(atIso).getTime();
    // exact-scoped policy wins
    const exact = this.policies
      .filter((p) => p.scope === `activity:${engine}`)
      .sort((a, b) => new Date(b.effectiveFrom).getTime() - new Date(a.effectiveFrom).getTime());
    for (const c of exact) {
      const from = new Date(c.effectiveFrom).getTime();
      const until = c.effectiveUntil ? new Date(c.effectiveUntil).getTime() : Infinity;
      if (from <= at && at < until) return c;
    }

    // generic activity policies that include payload.engine
    const generic = this.policies
      .filter((p) => p.scope === 'activity' && p.payload && p.payload.engine === engine)
      .sort((a, b) => new Date(b.effectiveFrom).getTime() - new Date(a.effectiveFrom).getTime());
    for (const c of generic) {
      const from = new Date(c.effectiveFrom).getTime();
      const until = c.effectiveUntil ? new Date(c.effectiveUntil).getTime() : Infinity;
      if (from <= at && at < until) return c;
    }

    return null;
  }

  addOffer(o: Offer) {
    // offers should also be validated for effective ranges
    if (o.effectiveUntil && new Date(o.effectiveUntil).getTime() <= new Date(o.effectiveFrom).getTime()) {
      throw new Error("offer_invalid_effective_range");
    }
    this.offers.push(o);
  }

  eligibleOffers(scope: string, atIso: string) {
    const at = new Date(atIso).getTime();
    return this.offers.filter((o) => {
      const from = new Date(o.effectiveFrom).getTime();
      const until = o.effectiveUntil ? new Date(o.effectiveUntil).getTime() : Infinity;
      if (!(from <= at && at < until)) return false;
      if (o.scope === "all") return true;
      return o.scope === scope;
    });
  }

  getAllPolicies() {
    return [...this.policies];
  }

  getAllOffers() {
    return [...this.offers];
  }

  // Return policy history for a given scope
  getPolicyHistory(scope: string) {
    return this.policies.filter((p) => p.scope === scope).sort((a, b) => new Date(a.effectiveFrom).getTime() - new Date(b.effectiveFrom).getTime());
  }
}
