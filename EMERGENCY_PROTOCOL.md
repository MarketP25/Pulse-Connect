# EMERGENCY PROTOCOL: Planetary System Containment & Restoration

This document details the end-to-end process for invoking, enforcing, and deactivating the Emergency Protocol within the PULSCO ecosystem. This protocol is designed for rapid, system-wide intervention during severe threats to ensure the integrity, security, and stability of the planetary platform.

## 1. Purpose and Scope

The Emergency Protocol is a critical, Founder-gated mechanism to protect the PULSCO ecosystem from severe, system-wide threats such as:

- Major security breaches (e.g., zero-day exploits, large-scale data exfiltration attempts).
- Coordinated economic attacks (e.g., flash loan attacks, market manipulation, large-scale fraud).
- Critical legal or regulatory demands (e.g., global asset freeze orders).
- Catastrophic infrastructure failures.

Upon activation, the protocol grants authority to take immediate, sweeping actions across the platform.

## 2. Activation Process (Trigger & Authorization)

The activation of the Emergency Protocol is a multi-stage, highly secured process:

1. **Threat Detection & CSI Advisory**:
   - The **Central Super Intelligence (CSI)** continuously monitors regional Edge telemetry, MARP audit sinks, and global network health for anomalies, attack patterns, or critical failures.
   - Upon detecting a severe threat, CSI generates a high-priority **CSI Advisory** signal, which is immediately pushed to the **Global System Oversight (GSO) dashboard**.

2. **Founder Review & Decision (GSO Dashboard)**:
   - A Founder-level user accesses the **GSO dashboard**, which visualizes the CSI Advisory, affected regions, and potential impact.
   - The Founder reviews the intelligence and makes a decision to invoke the Emergency Protocol.

3. **Founder Authorization (PC365 Dual-Control)**:
   - To initiate the activation, the Founder must provide a **Level 3 (L3) PC365 Attestation** via the GSO dashboard. This typically involves a hardware token or secure multi-factor authentication, cryptographically signing the activation request.
   - This signed request is sent to the `/api/governance/emergency-freeze` endpoint.

4. **Global State Propagation**:
   - The `emergency-freeze-api` verifies the Founder's PC365 attestation using `crypto-utils.ts`.
   - Upon successful verification, the `setGlobalGovernanceStatus()` function is called, which:
     - Persists the `EMERGENCY_FREEZE` status in a distributed Redis store.
     - Publishes the new status to a Redis Pub/Sub channel (`pulsco:governance:status_updates`).
   - All PULSCO nodes globally (Edge Gateways, backend services, GSO instances) subscribed to this channel instantly update their local `currentGovernanceStatus` to `EMERGENCY_FREEZE`.

## 3. End-to-End Enforcement (Technical Impact)

The `EMERGENCY_FREEZE` state triggers immediate, synchronized enforcement across all layers:

1. **Application-Level Circuit Breaker (Edge Gateway)**:
   - The `governanceGuard` middleware, which intercepts _every_ incoming API request at the Edge Gateway, performs an `O(1)` check of the global governance status.
   - If `EMERGENCY_FREEZE` is active, it **immediately returns a `503 Service Unavailable` HTTP response** to the client. This prevents any further application logic, database access, or business operations from executing.
   - (Note: A `DEGRADED` status would instead introduce a configurable throttle delay, shedding load gracefully without full blocking.)

2. **Background Stream Processing Halt**:
   - The `AuditVerificationStream` (used for processing audit logs) and other critical data streams check the global governance status within their `_transform` methods.
   - If `EMERGENCY_FREEZE` is active, they **immediately halt processing** by emitting an error, preventing resource consumption and potential processing of compromised data.

3. **Scheduled Job Abort**:
   - Background jobs, such as the `runFullAuditScan`, explicitly check the global governance status _before_ initiation.
   - If `EMERGENCY_FREEZE` is active, these jobs **abort entirely**, preventing them from starting or consuming resources during the emergency.

4. **Infrastructure-Level Traffic Rerouting (GSO Orchestration)**:
   - **GSO's Direct Control**: Upon Founder activation, the GSO system (via its Terraform-managed permissions) dynamically reconfigures global network policies.
   - **Cloud Armor/WAF Integration (`gso_containment_policy`)**:
     - **Public Traffic Redirection**: All incoming public traffic (`https://pulsco.global/*`) is redirected at the planetary edge (via Google Cloud Armor or similar WAF) to a static, hardened "Emergency Landing Page" (ELP). This provides a user-friendly message instead of raw `503` errors.
     - **Authorized Access Bypass**: The WAF is configured to allow pre-approved IP ranges (e.g., MARP team VPNs, GSO dashboard IPs) to bypass the ELP and reach the Edge Gateway for incident management and resolution.
   - **Load Balancer Reaction**: Upstream load balancers and ingress controllers (e.g., NGINX, Kubernetes Ingress) will observe the `503` responses from the Edge Gateway (for authorized traffic) and the WAF redirects for public traffic, effectively taking affected services out of rotation.

## 4. User Communication & Transparency

Users are informed promptly and politely through a multi-channel approach:

1. **Immediate API Feedback**: For requests that reach the Edge Gateway, a `503 Service Unavailable` response is returned with a clear message: "PULSCO is currently in an EMERGENCY FREEZE state due to critical system events. All non-essential operations are temporarily suspended."
2. **Formal Notifications (Email & Dashboard)**:
   - The `GSOService.notifyAffectedUsers` method is triggered upon activation.
   - **Detailed Emails**: Sent to affected users, explaining:
     - The reason for activation (e.g., "security incident").
     - Specific service impacts (e.g., "Financial transactions (Wallet, Payouts, Payments) are temporarily suspended to protect your assets," "Marketplace and Discovery services may experience high latency").
     - Clear Calls to Action (CTAs): "Please refrain from initiating sensitive transactions."
     - Reference to the official status page (`https://status.pulsco.global`).
   - **Dashboard Notifications**: Displayed prominently in the PULSCO Portal, mirroring the email content.

## 5. Deactivation and "Homecoming" Process

Restoring the system to an `ACTIVE` state involves a controlled "Homecoming" sequence:

1. **Founder Authorization**: A Founder-level user initiates deactivation via the GSO dashboard, again requiring a `PC365 Attestation`. This calls the `deactivateEmergencyProtocol` endpoint.
2. **Global State Update**: The global governance status is set back to `ACTIVE` via Redis Pub/Sub.
3. **GSO Infrastructure Reconfiguration**: The GSO system removes the WAF/Cloud Armor redirection and containment policies, restoring normal traffic flow.
4. **Session Homecoming (`GSOService.bulkSyncSessionsFromVault`)**:
   - GSO proactively identifies sessions that were routed to backup/satellite nodes during the emergency.
   - It bulk-syncs the latest session state from the Global Vault to pre-warm the restored primary cloud regions, prioritizing Founders and high-priority users.
   - **Integrity Verification**: `HashChain` checksums are used to verify the integrity of session data pulled from the Vault, preventing any compromised state from being restored.
5. **Degraded Transaction Replay (`GSOService.processDegradedQueue`)**:
   - Transactions that were enqueued during the `DEGRADED` or `EMERGENCY_FREEZE` state are replayed.
   - This process uses `FOR UPDATE SKIP LOCKED` for planetary scaling and `HashChain` verification to ensure the integrity of each replayed transaction.
6. **User Notification**: Formal notifications are sent to users, informing them that services have been restored and providing guidance on checking transaction statuses.

## 6. Auditing and Accountability

All Emergency Protocol events are meticulously audited:

- Activation and deactivation events are Founder-gated and logged in `gso_emergency_incidents` and `gso_action_logs`.
- These logs are hash-chained, ensuring an immutable, tamper-evident record for post-incident analysis and compliance.

## 7. Manual Intervention & Diagnostics

Authorized administrators can manage the governance state and verify system health using the following toolset:

### 7.1 invocation via Management Command

To manually invoke or lift a freeze from within the application container:

```bash
# Invoke Emergency Freeze
python manage.py invoke_emergency --activate --reason "Critical security patch deployment"

# Restore Active State (Homecoming)
python manage.py invoke_emergency --deactivate
```

### 7.2 Planetary Sanity Check

To verify connectivity, security layers (PC365), and cache persistence across the stack:

```bash
python sanity_check.py
```
