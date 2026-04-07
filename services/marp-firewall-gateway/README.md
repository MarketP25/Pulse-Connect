# MARP Firewall Gateway Bot Detection

## Backend-Only External Bot Protection

This gateway now includes backend-only bot detection and blocking:

- **Global Middleware:** BotDetectionMiddleware inspects all incoming requests for bot patterns, CSI signals, and internal allowlisting.
- **Internal Automation Allowlisting:** Trusted Pulsco subsystems and IPs are explicitly allowlisted, preserving internal automation.
- **Sensitive Route Hardening:** Enforcement, routing, and subsystem registration routes are protected with stricter backend-only checks.
- **No User Interaction:** All detection and blocking logic runs fully in the backend, invisible to end users.

## Configuration
- Bot detection is wired globally in `marp-firewall-gateway.module.ts`.
- Allowlist and CSI signal checks are configurable in `bot-detection.middleware.ts`.

## How It Works
1. All requests are inspected by bot detection middleware.
2. Internal automation (trusted subsystems/IPs) is allowlisted.
3. External bots are blocked based on user-agent, CSI signals, and request patterns.
4. Sensitive routes enforce stricter allowlisting.

## Summary
This system ensures backend-only bot protection, blocking external bots while preserving Pulsco internal automation. No user interaction is required; all logic is handled server-side.
