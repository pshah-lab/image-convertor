import type { NextConfig } from "next";
import path from "node:path";
const nextConfig: NextConfig = { outputFileTracingRoot: path.join(__dirname), headers: async () => [{ source: "/(.*)", headers: [{ key: "Content-Security-Policy", value: "default-src 'self'; img-src 'self' blob: data:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; worker-src 'self' blob:; connect-src 'self';" }] }] };
export default nextConfig;
