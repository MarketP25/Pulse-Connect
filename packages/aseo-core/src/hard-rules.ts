import { HardRuleReport, HardRuleViolation } from "./types";

export interface HardRuleValidationInput {
  pagePath: string;
  content: string;
  primaryKeyword: string;
  hasSchema: boolean;
  isStructured: boolean;
  isDuplicate: boolean;
  hasAudit: boolean;
}

function keywordDensity(content: string, keyword: string): number {
  const words = content.toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length === 0) {
    return 0;
  }

  const normalizedKeyword = keyword.toLowerCase().trim();
  if (!normalizedKeyword) {
    return 0;
  }

  const exactMatches = words.filter((word) => word.replace(/[^a-z0-9-]/g, "") === normalizedKeyword).length;
  return exactMatches / words.length;
}

export function validateHardRules(input: HardRuleValidationInput): HardRuleReport {
  const violations: HardRuleViolation[] = [];

  if (keywordDensity(input.content, input.primaryKeyword) > 0.045) {
    violations.push({
      code: "keyword_stuffing",
      message: `Keyword stuffing detected for ${input.pagePath}`
    });
  }

  if (input.isDuplicate) {
    violations.push({
      code: "duplicate_page",
      message: `Duplicate page detected for ${input.pagePath}`
    });
  }

  if (!input.isStructured) {
    violations.push({
      code: "unstructured_content",
      message: `Unstructured content detected for ${input.pagePath}`
    });
  }

  if (!input.hasSchema) {
    violations.push({
      code: "missing_schema",
      message: `Structured schema is missing for ${input.pagePath}`
    });
  }

  if (!input.hasAudit) {
    violations.push({
      code: "missing_audit",
      message: `Deployment audit is missing for ${input.pagePath}`
    });
  }

  return {
    passed: violations.length === 0,
    violations
  };
}
