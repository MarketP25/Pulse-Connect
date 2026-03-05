/** @type {import('next').NextConfig} */
const basePath = process.env.PULSCO_BASE_PATH || '/admin/procurement'

const nextConfig = {
  basePath,
  transpilePackages: ['@pulsco/pwa'],
  env: {
    DASHBOARD_ROLE: 'procurement',
    CSI_METRICS_SCOPE: 'procurement',
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
