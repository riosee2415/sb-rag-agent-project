import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  webpack: (config) => {
    // In monorepo, webpack context defaults to git root.
    // Prepend frontend/node_modules so bare CSS imports (e.g. @import "tailwindcss") resolve correctly.
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
