/** @type {import('next').NextConfig} */
const basePath = process.env.PULSCO_BASE_PATH || '/admin/superadmin'

const nextConfig = {
  basePath,
  transpilePackages: ['@pulsco/pwa'],
  experimental: {
    appDir: true,
  },
  env: {
    SUPERADMIN_DASHBOARD: 'true',
  },
  async rewrites() {
    return [
      {
        // Keep CSI telemetry on same-origin; never proxy to external APIs.
        source: '/api/public/telemetry',
        destination: '/api/public/telemetry',
      },
      {
        source: '/api/:path*',
        destination: 'http://localhost:3000/api/:path*', // Proxy to main admin API
      },
    ]
  },
}

export default nextConfig
