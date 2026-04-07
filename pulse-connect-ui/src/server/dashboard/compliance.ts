import { ComplianceProfile, ConsentSettings } from "@/types/dashboard";

const GDPR_COUNTRIES = new Set([
  "AT",
  "BE",
  "BG",
  "HR",
  "CY",
  "CZ",
  "DK",
  "EE",
  "FI",
  "FR",
  "DE",
  "GR",
  "HU",
  "IE",
  "IT",
  "LV",
  "LT",
  "LU",
  "MT",
  "NL",
  "PL",
  "PT",
  "RO",
  "SK",
  "SI",
  "ES",
  "SE",
  "IS",
  "LI",
  "NO"
]);

export function resolveComplianceProfile(country: string): ComplianceProfile {
  const code = country.trim().toUpperCase();
  if (GDPR_COUNTRIES.has(code) || code === "GB") {
    return "gdpr";
  }
  if (code === "US") {
    return "ccpa";
  }
  return "global-default";
}

export function defaultConsents(): ConsentSettings {
  return {
    privacyPolicy: true,
    termsOfService: true,
    dataProcessing: true,
    marketing: false,
    locationServices: true,
    profiling: false
  };
}

export function canUseMarketing(consents: ConsentSettings): boolean {
  return consents.marketing && consents.dataProcessing;
}

export function canUseLocationFeatures(consents: ConsentSettings): boolean {
  return consents.locationServices && consents.dataProcessing;
}
