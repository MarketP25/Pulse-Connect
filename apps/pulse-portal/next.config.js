/** @type {import('next').NextConfig} */
const basePath =
  process.env.PULSCO_BASE_PATH && process.env.PULSCO_BASE_PATH !== '/'
    ? process.env.PULSCO_BASE_PATH
    : ''

const nextConfig = {
  basePath,
  // Enterprise PWA assets live in /public (manifest.webmanifest, sw.js, offline.html, icons/*).
  transpilePackages: ['@pulsco/pwa'],
  eslint: {
    // Repo-wide ESLint plugins may not be present in all environments.
    // Keep builds deterministic; run lint separately in CI if desired.
    ignoreDuringBuilds: true,
  },
}

module.exports = nextConfig
