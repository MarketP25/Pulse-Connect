/** @type {import('next').NextConfig} */
const basePath = process.env.PULSCO_BASE_PATH || '/admin/commercial'

const nextConfig = {
  // Commercial Dashboard Configuration
  basePath,
  transpilePackages: ['@pulsco/pwa'],
  experimental: {
    serverComponentsExternalPackages: ['@pulsco/admin-auth-client'],
  },
  env: {
    DASHBOARD_ROLE: 'commercial',
    CSI_METRICS_SCOPE: 'commercial-operations',
  },
  // Security headers for admin dashboard
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
        ],
      },
    ]
  },
}

export default nextConfig
