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
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/**",
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
      ...additionalMediaPatterns,
    ],
    formats: ["image/avif", "image/webp"],
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
