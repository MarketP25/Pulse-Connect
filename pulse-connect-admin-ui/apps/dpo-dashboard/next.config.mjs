/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@pulsco/admin-ui-core', '@pulsco/pwa', '@pulsco/admin-shared-types', '@pulsco/admin-auth-client'],
  poweredByHeader: false,
  reactStrictMode: true,
}

export default nextConfig
