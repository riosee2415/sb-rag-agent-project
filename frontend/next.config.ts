import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Turbopack (Next.js 16 default) — monorepo node_modules resolution handled natively
  turbopack: {},

  // Webpack fallback for `next dev --webpack` (local dev only)
  webpack: (config) => {
    config.resolve.modules = [
      path.resolve(__dirname, "node_modules"),
      ...(Array.isArray(config.resolve.modules)
        ? config.resolve.modules
        : ["node_modules"]),
    ];
    return config;
  },
};

export default nextConfig;
