# PULSCO (Pulse Connect) — Admin UI

Next.js administrative interface for Pulse Connect (PULSCO). Used for operational dashboards and administrative workflows aligned with governance and subsystem monitoring.

## Getting Started

From the repository root:

```bash
pnpm install
pnpm dev:admin   # if provided by workspace scripts
```

Otherwise, from this package directory:

```bash
pnpm install
pnpm dev
```

Open http://localhost:3000 when the development server is running.

## Development Notes

- Entry: src/app/page.tsx (or app/page.tsx depending on structure)
- Localization: follow the same provider patterns used in the UI packages; ensure locale switching is wired in admin views where relevant.
- Environment variables (examples): configure NEXTAUTH_* if authentication is enabled for admin.

## Scripts (examples)

Check package.json for actual scripts:
- pnpm dev — development server
- pnpm build — production build
- pnpm start — production server
- pnpm lint — linting
- pnpm test — tests where applicable

## Related Backend Services

- MARP Governance Core and Firewall
- Edge Gateway (adapter routing and audits)
- Pulse Intelligence Core (decisions, routing)
- Proximity Powerhouse (geocoding/distance primitives)

## Deployment

Deploy via your platform of choice (Kubernetes/Vercel). Set environment variables according to environment (auth, base URLs, localization).

## License

ISC (see repository)
