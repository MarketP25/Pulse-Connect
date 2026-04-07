import { dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('[pulse-connect-core next.config] loaded', {
  cwd: process.cwd(),
  filename: __filename,
  dirname: __dirname
});

const nextConfig = {
  reactStrictMode: true
};

export default nextConfig;
