/** @type {import('next').NextConfig} */
const basePath = process.env.PULSCO_BASE_PATH || '/admin/legal-finance'

const nextConfig = {
  basePath,
  transpilePackages: ['@pulsco/pwa'],
  env: {
    DASHBOARD_ROLE: 'legal-finance',
    CSI_METRICS_SCOPE: 'legal-finance',
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
    ]
  },
}

export default nextConfig
