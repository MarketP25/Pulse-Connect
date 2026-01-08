# PULSCO (Pulse Connect) — UI

Next.js application for Pulse Connect (PULSCO). This UI consumes backend services (Edge, Intelligence Core, Proximity) and includes localization scaffolding as reflected in the repository tests and components.

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
