import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === 'production';

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "d2jialh2zz1lcb.cloudfront.net",
      },
    ],
  },
  // Good for S3 hosting – makes URLs end with `/`
  trailingSlash: true,
  typescript: {
    ignoreBuildErrors: true,
  },
  // E2E-only same-origin API proxy: avoids CORS (the dev backend only allows
  // localhost:3000) so Playwright can run the app on any port. Activated by
  // setting E2E_PROXY=1 + E2E_API_TARGET for the test dev server only.
  ...(process.env.E2E_PROXY
    ? {
        async rewrites() {
          const target =
            process.env.E2E_API_TARGET ||
            'http://ec2-13-48-49-25.eu-north-1.compute.amazonaws.com/api';
          return {
            beforeFiles: [
              { source: '/api-proxy/:path*', destination: `${target}/:path*` },
            ],
            afterFiles: [],
            fallback: [],
          };
        },
      }
    : {}),
  // Only apply static export and E:\build output during production build
  ...(isProd ? {
    output: 'export',
    distDir: 'build',
  } : {}),
};

export default nextConfig;
