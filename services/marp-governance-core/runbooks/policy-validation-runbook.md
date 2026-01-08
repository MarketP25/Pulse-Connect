# MARP Policy Validation Runbook

## Overview
This runbook provides procedures for validating policies through the MARP governance firewall, ensuring compliance with planetary governance standards and CSI-powered intelligence validation.

## Prerequisites
- Access to MARP Governance Core service
- PC365 authentication credentials
- Council decision references
- Policy content in JSON format

## Emergency Contacts
- **Primary**: MARP Governance Team (`marp-governance@pulsco.com`)
- **Secondary**: Founder Arbitration (`founder-arbitration@pulsco.com`)
- **CSI Emergency**: Central Super Intelligence Center (`csi-emergency@pulsco.com`)

## Policy Validation Process

### Step 1: Prepare Policy Package
```bash
# Create policy validation request
curl -X POST https://marp-governance.pulsco.com/marp/policies/validate \
  -H "Authorization: Bearer <pc365-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "policyName": "GDPR Compliance Policy v2.1",
    "policyVersion": "2.1.0",
    "policyContent": {
      "rules": [
        {
          "id": "gdpr-data-retention",
          "condition": "data.age > 2555.days",
          "action": "delete"
        }
      ],
      "complianceRefs": {
        "gdpr": "Article 17",
        "ccpa": "Section 1798.100"
      }
    },
    "subsystemScope": "ecommerce",
    "complianceRefs": {
      "gdpr": true,
      "ccpa": true,
      "regional": ["EU", "US", "CA"]
    }
  }'
```

### Step 2: Review Validation Results
**Expected Response:**
```json
{
  "isValid": true,
  "validationErrors": null,
  "complianceCheck": {
    "gdprCompliant": true,
    "ccpaCompliant": true,
    "regionalCompliance": ["EU", "US", "CA"],
    "riskLevel": "low",
    "csiPoweredInsights": [
      "CSI-validated: Historical compliance precedents reviewed",
      "CSI-enhanced: Risk mitigation strategies validated",
      "CSI-confirmed: Regional sovereignty requirements met"
    ]
  },
  "riskAssessment": "low"
}
```

### Step 3: Handle Validation Failures

#### Case A: Structure Errors
**Symptoms:** `validationErrors.structure` present
**Action:**
1. Review policy JSON structure
2. Ensure all required fields present
3. Validate against policy schema
4. Resubmit corrected policy

#### Case B: Compliance Reference Missing
**Symptoms:** `validationErrors.compliance` present
**Action:**
1. Add missing compliance references
2. Consult legal team for appropriate references
3. Include regional compliance mappings
4. Resubmit with complete compliance refs

#### Case C: Policy Conflicts
**Symptoms:** `validationErrors.conflicts` present
**Action:**
1. Review conflicting policies list
2. Compare policy versions and scopes
3. Either update version or resolve conflicts
4. May require council arbitration

#### Case D: High Risk Assessment
**Symptoms:** `riskAssessment: "high"` or `"critical"`
**Action:**
1. Review CSI-powered insights for risk factors
2. Implement additional safeguards
3. May require founder approval
4. Consider phased rollout

### Step 4: Policy Signing (If Validation Passes)

```bash
# Sign validated policy
curl -X POST https://marp-governance.pulsco.com/marp/policies/sign \
  -H "Authorization: Bearer <pc365-token>" \
  -H "x-pc365: <pc365-attestation>" \
  -H "x-founder: superadmin@pulsco.com" \
  -H "x-device: <device-fingerprint>" \
  -H "Content-Type: application/json" \
  -d '{
    "policyId": "policy-uuid-here",
    "councilDecisionId": "council-decision-uuid",
    "pc365Attestation": {
      "authorization": "<service-token>",
      "x-pc365": "<attestation-token>",
      "x-founder": "superadmin@pulsco.com",
      "x-device": "<device-fingerprint>"
    },
    "founderOverride": false
  }'
```

## CSI Integration Monitoring

### Normal Operation
- CSI contributes 40% to policy validation
- Response time: <500ms P95
- Availability: >99.9%

### Degradation Handling
**Symptom:** CSI insights unavailable
**Impact:** Local AI takes 100% of validation load
**Action:**
1. Continue with local validation
2. Monitor CSI service health
3. Alert when CSI recovers

**Symptom:** CSI response >500ms
**Impact:** Increased policy validation latency
**Action:**
1. Enable circuit breaker
2. Route to backup CSI instance
3. Alert performance team

## Troubleshooting

### Common Issues

#### Issue: PC365 Authentication Failed
```
Error: PC365: Invalid founder identity
```
**Solution:**
1. Verify founder email matches `superadmin@pulsco.com`
2. Confirm device fingerprint is current
3. Regenerate PC365 attestation token
4. Check token expiration (<15 minutes)

#### Issue: CSI Validation Timeout
```
Error: CSI validation insights unavailable
```
**Solution:**
1. Check CSI service health dashboard
2. Verify MARP firewall allows CSI queries
3. Confirm CSI endpoint configuration
4. Fallback to local validation

#### Issue: Hash Chain Validation Failed
```
Error: Hash chain integrity compromised
```
**Solution:**
1. Verify policy ID and version consistency
2. Check database connectivity
3. Review recent schema migrations
4. Contact database administration team

### Performance Issues

#### High Latency Validation
**Threshold:** >500ms P95
**Investigation:**
1. Check CSI response times
2. Monitor database query performance
3. Review concurrent validation load
4. Consider caching frequently validated policies

#### Memory Usage Spikes
**Threshold:** >80% container memory
**Investigation:**
1. Check for policy content size limits
2. Monitor CSI response payload sizes
3. Review garbage collection performance
4. Consider horizontal scaling

## Monitoring & Alerting

### Key Metrics
- `marp_policy_validation_duration`: Policy validation response time
- `marp_policy_validation_success_rate`: Percentage of successful validations
- `marp_csi_integration_health`: CSI service availability
- `marp_policy_conflict_rate`: Rate of policy conflicts detected

### Alert Conditions
- Policy validation >500ms for 5 minutes
- CSI integration failure rate >5%
- Policy signing failures >1 per hour
- Hash chain validation failures >0

## Rollback Procedures

### Emergency Policy Rollback
1. Identify problematic policy by ID
2. Execute rollback via Admin UI
3. Verify policy status changed to inactive
4. Confirm Edge nodes receive updated bundle
5. Monitor for stability restoration

### CSI Integration Disable
1. Set feature flag `csi-integration-enabled: false`
2. Restart MARP governance service
3. Verify local validation only active
4. Monitor validation performance
5. Re-enable when CSI stable

## Post-Incident Review

### Required Analysis
1. Timeline of incident
2. Root cause identification
3. Impact assessment
4. Corrective actions implemented
5. Prevention measures added

### Lessons Learned Documentation
- Update this runbook with new procedures
- Add monitoring for newly discovered failure modes
- Review alert thresholds
- Update contact information

## Related Documentation
- [MARP Firewall Operations](./firewall-operations-runbook.md)
- [Council Decision Process](./council-decision-runbook.md)
- [CSI Integration Guide](./csi-integration-guide.md)
- [Security Incident Response](./security-incident-runbook.md)
