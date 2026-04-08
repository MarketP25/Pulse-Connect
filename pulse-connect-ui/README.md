# PULSCO (Pulse Connect) — UI

Next.js application for Pulse Connect (PULSCO). This UI consumes backend services (Edge, Intelligence Core, Proximity) and includes localization scaffolding as reflected in the repository tests and components.

## Universal User Dashboard

- Implementation documentation: `docs/universal-user-dashboard.md`
- Demo routes:
  - `/dashboard?userId=demo-basic`
  - `/dashboard?userId=demo-premium`
  - `/dashboard?userId=demo-enterprise`
- Includes modular API routes under `src/app/api/dashboard/*` for onboarding, profile, KYC, subscriptions, ecommerce, insights, places, communication, marketing, security, interactions, and ops.
- Expanded module routes now include:
  - `reporting`, `fraud`, `identity`, `billing`, `places-ops`, `matchmaking-ops`, `governance`, `localization-advanced`, `proximity-advanced`
- Localization and geocoding are subsystem-backed:
  - Localization dictionary translation via `PULSCO_LOCALIZATION_API_URL` (or Azure translator fallback).
  - Places distance ranking via proximity geocoding (`PULSCO_PROXIMITY_API_URL`).
  - Places tile map rendering via Google Maps JS API (`NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` from `.env.local`).
- PULSCO AI chatbot is available in the dashboard:
  - Primary live mode via backend chatbot (`PULSCO_CHATBOT_API_URL` or `PULSE_INTELLIGENCE_CORE_URL`)
  - Secondary live mode via direct AI engine (`PULSCO_AI_API_URL` or `AI_COORDINATOR_URL`)
  - Automatic fallback mode if live endpoint is unavailable

## Getting Started

From the repository root:

```bash
pnpm install
pnpm dev:ui    # if provided by workspace scripts
```

Otherwise, from this package directory:

```bash
pnpm install
pnpm dev
```

Open http://localhost:3000 in your browser when the dev server is running.

## Development Notes

- Main entry: src/app/page.tsx (or app/page.tsx depending on structure)
- Localization support is present (see tests/context/LanguageProvider.test.tsx in the repo for patterns). Ensure your components subscribe to the shared localization provider and switch languages via UI controls.
- Environment variables (examples): NEXTAUTH_URL, NEXTAUTH_SECRET (if authentication is enabled in this UI). Configure per your deployment.
- Dashboard integration variables (set as needed for live service mode):
  - `PULSCO_CSI_GATEWAY_URL`
  - `PULSCO_LOCALIZATION_API_URL`
  - `PULSCO_PROXIMITY_API_URL`
  - `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`
  - `PULSCO_CHATBOT_API_URL` or `PULSE_INTELLIGENCE_CORE_URL`
  - `PULSCO_AI_API_URL` or `AI_COORDINATOR_URL`
  - `PULSCO_REPORTING_API_URL`
  - `PULSCO_IDENTITY_API_URL`
  - `PULSCO_BILLING_API_URL`
  - `PULSCO_PLACES_API_URL`
  - `PULSCO_MATCHMAKING_API_URL`
  - `PULSCO_MARP_OBSERVABILITY_API_URL`
  - `PULSCO_MARP_GOVERNANCE_API_URL`
  - `PULSCO_MARP_ARBITRATION_API_URL`

## Scripts (examples)

Check package.json for actual scripts. Typical Next.js scripts in this repository:

- pnpm dev — start development server
- pnpm build — build production bundle
- pnpm start — start production server
- pnpm lint — lint the codebase
- pnpm test — run tests where applicable

## Related Services

- Edge Gateway: governance perimeter and adapter routing
- Pulse Intelligence Core: decisioning, planetary load balancing
- Proximity Powerhouse: geocoding and distance primitives

## Deployment

- Recommended deployment through your chosen platform (Kubernetes or Vercel). Align base URL, auth, and localization settings according to environment.

## License

ISC (see repository)
