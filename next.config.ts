import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === 'production';

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Good for S3 hosting – makes URLs end with `/`
  trailingSlash: true,
  typescript: {
    ignoreBuildErrors: true,
  },
  // Only apply static export and E:\build output during production build
  ...(isProd ? {
    output: 'export',
    distDir: 'build',
  } : {}),
};

export default nextConfig;
