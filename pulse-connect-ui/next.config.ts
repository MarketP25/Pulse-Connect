import type { NextConfig } from "next";

const basePath = process.env.PULSCO_BASE_PATH || "/connect";

const nextConfig: NextConfig = {
  basePath,
  transpilePackages: ["@pulsco/pwa"],
};

export default nextConfig;
