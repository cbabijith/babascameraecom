import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@babascamera/db", "@babascamera/ui"],
  serverExternalPackages: ["postgres"],
  images: {
    remotePatterns: [      {
        protocol: "https",
        hostname: "t3.storageapi.dev",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "*.t3.storageapi.dev",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "*.tigris.dev",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "babas.blr1.cdn.digitaloceanspaces.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "babasphotostore.blr1.cdn.digitaloceanspaces.com",
        pathname: "/**",
      },
    ],
    formats: ["image/avif", "image/webp"],
  },
  experimental: {
    optimizePackageImports: ["lucide-react"],
    serverActions: {
      bodySizeLimit: "31mb",
    },
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), payment=(self)",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
