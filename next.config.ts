import { createMDX } from "fumadocs-mdx/next";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactStrictMode: false,
  env: {
    NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID:
      process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID,
    NEXT_PUBLIC_BASE_URL: process.env.NEXT_PUBLIC_BASE_URL,
  },
  pageExtensions: ["ts", "tsx", "js", "jsx", "md", "mdx"],
  // Ensure local registry assets are traced into the build for the docs route
  outputFileTracingIncludes: {
    "/app/docs/[[...slug]]": ["registry/**", "public/r/**"],
  },
  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      crypto: false,
    };
    config.externals = config.externals || [];
    config.externals.push({
      'node:crypto': 'crypto',
    });
    return config;
  },
};

const withMDX = createMDX({});

export default withMDX(nextConfig);
