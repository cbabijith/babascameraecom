import type { NextConfig } from "next";

const additionalMediaPatterns = (process.env.STOREFRONT_MEDIA_HOSTS ?? "")
  .split(",")
  .map((hostname) => hostname.trim().toLowerCase())
  .filter((hostname) => /^[a-z0-9.-]+$/.test(hostname))
  .map((hostname) => ({
    protocol: "https" as const,
    hostname,
    pathname: "/**",
  }));

const nextConfig: NextConfig = {
  distDir: process.env.NEXT_DIST_DIR?.trim() || ".next",
  poweredByHeader: false,
  transpilePackages: ["@babascamera/config", "@babascamera/db", "@babascamera/ui"],
  serverExternalPackages: ["postgres", "sharp", "detect-libc"],
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
      {
        protocol: "https",
        hostname: "*.up.railway.app",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "*.railway.app",
        pathname: "/**",
      },
      {
        protocol: "http",
        hostname: "localhost",
        pathname: "/**",
      },
      {
        protocol: "http",
        hostname: "127.0.0.1",
        pathname: "/**",
      },
      ...additionalMediaPatterns,
    ],
    formats: ["image/avif", "image/webp"],
  },
  async redirects() {
    return [
      {
        source: "/account",
        destination: "/profile",
        permanent: false,
      },
      {
        source: "/account/:path*",
        destination: "/profile",
        permanent: false,
      },
    ];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
// deploy: 1787387708
