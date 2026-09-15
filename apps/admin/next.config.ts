import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@babascamera/db", "@babascamera/ui"],
  serverExternalPackages: ["postgres", "sharp", "detect-libc", "postcss", "nanoid"],
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
    // CSP: the admin loads no third-party scripts (Google sign-in is a
    // server-side redirect), so scripts stay self-hosted. 'unsafe-inline'
    // and 'unsafe-eval' remain because Next's hydration and dev overlay
    // require them; everything else is locked down.
    const csp = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https://*.storageapi.dev https://*.tigris.dev https://*.digitaloceanspaces.com https://*.up.railway.app https://*.railway.app",
      "font-src 'self' data:",
      "connect-src 'self'",
      "frame-ancestors 'none'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "upgrade-insecure-requests",
    ].join("; ");
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
          { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
          { key: "Content-Security-Policy", value: csp },
        ],
      },
    ];
  },
};

export default nextConfig;
