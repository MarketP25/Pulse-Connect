/** @type {import('next').NextConfig} */
const basePath = process.env.PULSCO_BASE_PATH || '/connect'

const nextConfig = {
  basePath,
  transpilePackages: ['@pulsco/pwa'],
}

export default nextConfig
