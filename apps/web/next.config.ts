import type { NextConfig } from "next";

// The object-storage host is environment-provided so switching storage
// providers never requires a code change.
function hostFromUrl(url?: string) {
  if (!url) return undefined;
  try {
    return new URL(url).hostname;
  } catch {
    return undefined;
  }
}

const s3EndpointHost = hostFromUrl(process.env.S3_ENDPOINT);
const s3MediaPatterns = s3EndpointHost
  ? [
      { protocol: "https" as const, hostname: s3EndpointHost, pathname: "/**" },
      { protocol: "https" as const, hostname: `*.${s3EndpointHost}`, pathname: "/**" },
    ]
  : [];

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
    remotePatterns: [
      ...s3MediaPatterns,
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
  // The storefront serves no API traffic itself: every /api request is
  // proxied to the Hono backend on Railway (BACKEND_ORIGIN), which owns the
  // database. beforeFiles ensures the proxy wins over the legacy route
  // modules that still live under src/app/api (kept as the backend's source
  // of truth, imported by apps/backend).
  async rewrites() {
    const backendOrigin = process.env.BACKEND_ORIGIN?.trim();
    if (!backendOrigin) return { beforeFiles: [] };
    return {
      beforeFiles: [
        {
          source: "/api/:path*",
          destination: `${backendOrigin.replace(/\/+$/, "")}/api/:path*`,
        },
      ],
      afterFiles: [],
      fallback: [],
    };
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
// deploy: 1787392800
