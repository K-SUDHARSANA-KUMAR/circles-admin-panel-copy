import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Good for S3 hosting – makes URLs end with `/`
  trailingSlash: true,
  typescript: {
    ignoreBuildErrors: true,
  },
  output: 'export',
  distDir: 'build',
};

export default nextConfig;
